import { useRef, useState } from "react";
import { Loader2, Upload, FileText, X, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "./SectionCard";
import {
  ACCEPTED_EXTS,
  ACCEPTED_MIME,
  MAX_FILE_BYTES,
  assertPdfPageLimit,
  extToMime,
  extractResumeText,
} from "@/lib/resumeParser";
import { hashResumeText } from "@/lib/resumeHash";
import { cn } from "@/lib/utils";
import { useEntitlements } from "@/hooks/useEntitlements";
import { PLAN_LABEL } from "@/lib/entitlements";
import { UpgradePlanDialog } from "./UpgradePlanDialog";

type Stage = "idle" | "extracting" | "uploading" | "analyzing";

type Props = {
  userId: string;
  onAnalyzed: (analysisId: string, meta?: { cached?: boolean }) => void;
  className?: string;
};

export const ResumeUploadCard = ({ userId, onAnalyzed, className }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<"resume_uploads" | "analyses">("analyses");
  const ent = useEntitlements();
  const uploadAllowed = ent.can("resume_uploads");
  const analysisAllowed = ent.can("analyses");
  const blocked = !ent.loading && (!uploadAllowed || !analysisAllowed);
  const analysisLimit = ent.limit("analyses");

  const stageLabel: Record<Stage, string> = {
    idle: "",
    extracting: "Reading resume…",
    uploading: "Uploading…",
    analyzing: "AI is reviewing — this takes ~10s",
  };

  const reset = () => {
    setStage("idle");
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    if (blocked) {
      setUpgradeFeature(!analysisAllowed ? "analyses" : "resume_uploads");
      setShowUpgrade(true);
      return;
    }
    try {
      // Validate
      if (file.size > MAX_FILE_BYTES) {
        toast.error("File too large. Resumes must be 5 MB or smaller.");
        return;
      }
      const mime = file.type || extToMime(file.name) || "";
      if (!ACCEPTED_MIME.includes(mime)) {
        toast.error("Unsupported file. Please upload a PDF or TXT resume.");
        return;
      }
      try { await assertPdfPageLimit(file); } catch (err) {
        toast.error(err instanceof Error ? err.message : "This PDF is too long.");
        return;
      }
      setFileName(file.name);

      // 1) Extract text in browser AND upload to storage in parallel.
      //    These are independent, so running them concurrently roughly
      //    halves the perceived wait before analysis can start.
      setStage("extracting");
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${userId}/${Date.now()}-${safeName}`;

      const extractPromise = extractResumeText(file);
      const uploadPromise = supabase.storage
        .from("resumes")
        .upload(path, file, { contentType: mime, upsert: false });

      // Flip the visual stage once extraction is done so the user sees progress.
      const text = await extractPromise;
      if (!text || text.length < 80) {
        toast.error("Couldn't read enough text. Try a different file.");
        reset();
        return;
      }
      setStage("uploading");

      // Fingerprint the extracted text so re-uploads of the same resume reuse
      // the same row (and therefore the same cached analysis & scores).
      const contentHash = await hashResumeText(text);

      const { data: existing } = await supabase
        .from("resumes")
        .select("id, file_path")
        .eq("user_id", userId)
        .eq("content_hash", contentHash)
        .maybeSingle();

      let resumeRow: { id: string };

      if (existing) {
        // Same content already on file — skip the duplicate upload entirely.
        // Cancel the in-flight storage upload's effect by removing the new
        // object once it lands; keep the original file_path intact.
        uploadPromise.then(({ error }) => {
          if (!error) supabase.storage.from("resumes").remove([path]);
        });
        resumeRow = { id: existing.id };
      } else {
        const { error: upErr } = await uploadPromise;
        if (upErr) throw upErr;

        const { data: inserted, error: insErr } = await supabase
          .from("resumes")
          .insert({
            user_id: userId,
            file_name: file.name,
            file_path: path,
            file_size: file.size,
            mime_type: mime,
            raw_text: text,
            content_hash: contentHash,
          })
          .select()
          .single();
        if (insErr) throw insErr;
        resumeRow = inserted;
      }

      // 4) Analyze — first try to reuse a cached analysis for the same
      // (resume, target_role). The resume row is keyed by content_hash, so
      // an existing row already implies the text hasn't changed.
      setStage("analyzing");

      if (existing) {
        const roleNorm = targetRole.trim() || null;
        let cachedQuery = supabase
          .from("resume_analyses")
          .select("id")
          .eq("user_id", userId)
          .eq("resume_id", resumeRow.id)
          .order("created_at", { ascending: false })
          .limit(1);
        cachedQuery = roleNorm
          ? cachedQuery.eq("target_role", roleNorm)
          : cachedQuery.is("target_role", null);
        const { data: cached } = await cachedQuery.maybeSingle();
        if (cached?.id) {
          onAnalyzed(cached.id, { cached: true });
          reset();
          return;
        }
      }

      const { data: fnData, error: fnErr } = await supabase.functions.invoke(
        "analyze-resume",
        {
          body: {
            resume_id: resumeRow.id,
            raw_text: text,
            target_role: targetRole.trim() || undefined,
          },
        },
      );
      const quotaCode =
        (fnData as { code?: string } | null)?.code ||
        (fnErr as { context?: { code?: string } } | null)?.context?.code;
      if (quotaCode === "OVER_QUOTA") {
        setUpgradeFeature("analyses");
        setShowUpgrade(true);
        ent.refresh();
        reset();
        return;
      }
      if (fnErr) {
        // Try to extract a useful error message
        const msg =
          (fnErr as { message?: string })?.message || "Analysis failed";
        throw new Error(msg);
      }
      if (fnData?.error) throw new Error(fnData.error);

      const analysisId = fnData?.analysis?.id as string | undefined;
      if (!analysisId) throw new Error("No analysis returned");

      toast.success("Resume analyzed.");
      onAnalyzed(analysisId, { cached: false });
      ent.refresh();
      reset();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
      reset();
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (stage !== "idle") return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const busy = stage !== "idle";

  return (
    <SectionCard className={cn("p-0 overflow-hidden", className)}>
      {blocked && (
        <div className="px-6 sm:px-7 pt-5 pb-3 flex items-center gap-3 border-b border-foreground/[0.06] bg-foreground/[0.02]">
          <span className="w-7 h-7 rounded-lg bg-foreground/[0.06] flex items-center justify-center shrink-0">
            <Lock className="w-3.5 h-3.5 text-foreground/55" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-medium tracking-tight text-foreground">
              {PLAN_LABEL[ent.plan]} plan limit reached
            </p>
            <p className="text-[11.5px] text-foreground/55">
              You've used your monthly resume upload. Upgrade for more.
            </p>
          </div>
          <Link
            to="/app/upgrade"
            className="shrink-0 text-[11.5px] font-medium px-3 py-1.5 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            Upgrade
          </Link>
        </div>
      )}
      <button
        type="button"
        onClick={() => !busy && !blocked && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy && !blocked) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        disabled={busy || blocked}
        className={cn(
          "w-full text-left p-6 sm:p-7 transition-colors",
          dragOver ? "bg-foreground/[0.03]" : "bg-transparent",
          busy && "cursor-default",
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center",
              busy
                ? "bg-foreground/5"
                : "bg-gradient-to-br from-[#0E0B1F] to-[#3a2d5e] text-white",
            )}
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin text-foreground/70" />
            ) : fileName ? (
              <FileText className="w-4 h-4" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              {busy ? "Working" : "Upload your resume"}
            </p>
            <p className="mt-1 text-[16px] leading-snug font-medium tracking-tight text-foreground truncate">
              {busy
                ? stageLabel[stage]
                : fileName ?? "Drop a PDF or TXT (max 5 MB, 3 pages) — or click to browse"}
            </p>
            <p className="mt-1 text-[12px] text-foreground/55">
              {busy
                ? "Hang tight. This is a real review, not a checkbox."
                : "We extract skills, experience, projects, and run an ATS check."}
            </p>
          </div>
          {fileName && !busy && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              className="shrink-0 w-7 h-7 rounded-full hover:bg-foreground/5 flex items-center justify-center text-foreground/60"
              aria-label="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {busy && (
          <div className="mt-4 h-[3px] rounded-full bg-foreground/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                width: stage === "extracting" ? "30%" : stage === "uploading" ? "60%" : "92%",
                background: "linear-gradient(90deg,#0E0B1F,#6D54B3)",
                transition: "width 600ms ease",
              }}
            />
          </div>
        )}
      </button>

      <div className="border-t border-foreground/[0.06] px-6 sm:px-7 py-3 flex items-center gap-3">
        <span className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium shrink-0">
          Target role
        </span>
        <input
          type="text"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          disabled={busy}
          placeholder="e.g. Senior PM at Linear (optional — sharpens job-match %)"
          className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-foreground/35 outline-none tracking-tight"
        />
      </div>

      {ent.plan === "pro" && typeof analysisLimit === "number" && (
        <div className="border-t border-foreground/[0.06] px-6 sm:px-7 py-2 flex items-center justify-between text-[11.5px] tracking-tight text-foreground/60">
          <span>Analyses this month</span>
          <span className="font-medium text-foreground/85">
            {ent.usage.analyses} / {analysisLimit}
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTS.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <UpgradePlanDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={ent.plan}
        feature={upgradeFeature}
      />
    </SectionCard>
  );
};
