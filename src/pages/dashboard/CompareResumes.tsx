import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  GitCompare,
  Upload,
  FileText,
  Loader2,
  Trophy,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { UpgradeLock } from "@/components/dashboard/UpgradeLock";
import { UsageMeter } from "@/components/dashboard/UsageMeter";
import { EmptyState, PreviewCompare } from "@/components/dashboard/EmptyState";
import {
  ACCEPTED_EXTS,
  ACCEPTED_MIME,
  MAX_FILE_BYTES,
  extToMime,
  extractResumeText,
} from "@/lib/resumeParser";
import { hashResumeText } from "@/lib/resumeHash";
import { cn } from "@/lib/utils";

type ResumeRow = {
  id: string;
  file_name: string;
  file_path: string;
  created_at: string;
};

type SideScore = {
  label: string;
  ats_score: number;
  impact_score: number;
  relevance_score: number;
  overall_score: number;
  interview_chance: number;
  strengths: string[];
  weaknesses: string[];
};

type Comparison = {
  winner: "a" | "b" | "tie";
  verdict: string;
  resume_a: SideScore;
  resume_b: SideScore;
  resume_a_id: string;
  resume_b_id: string;
  target_role: string | null;
  key_differences: { dimension: string; resume_a: string; resume_b: string }[];
  recommendations_for_loser: string[];
};

const CompareResumes = () => {
  const { user, loading: authLoading } = useAuth();
  const ent = useEntitlements();
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [aId, setAId] = useState<string | null>(null);
  const [bId, setBId] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<Comparison | null>(null);

  const allowed = ent.can("compare_versions");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("resumes")
        .select("id, file_name, file_path, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
    if (cancelled) return;
      // Oldest first → Resume A is the first uploaded, Resume B is the second.
      const rows = ((data ?? []) as ResumeRow[]).slice().reverse();
      setResumes(rows);
      setAId(rows[0]?.id ?? null);
      setBId(rows[1]?.id ?? null);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading) {
    return (
      <div className="text-foreground/55 text-sm">Loading…</div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const handleDelete = async (id: string) => {
    if (!user) return;
    const target = resumes.find((r) => r.id === id);
    if (!target) return;
    try {
      if (target.file_path) {
        await supabase.storage.from("resumes").remove([target.file_path]);
      }
      const { error } = await supabase.from("resumes").delete().eq("id", id);
      if (error) throw error;
      setResumes((prev) => {
        const next = prev.filter((r) => r.id !== id);
        setAId(next[0]?.id ?? null);
        setBId(next[1]?.id ?? null);
        return next;
      });
      toast.success("Resume deleted");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't delete resume");
    }
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ACCEPTED_EXTS.includes(ext as (typeof ACCEPTED_EXTS)[number])) {
      toast.error("Use a PDF, DOCX, or TXT file");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File is too large (max 8 MB)");
      return;
    }
    try {
      toast.loading("Uploading resume…", { id: "compare-upload" });

      // Extract text and upload to storage in parallel — they're independent.
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const contentType = extToMime(ext) ?? file.type ?? ACCEPTED_MIME[0];

      const extractPromise = extractResumeText(file);
      const uploadPromise = supabase.storage
        .from("resumes")
        .upload(path, file, { contentType, upsert: false });

      const text = await extractPromise;
      if (!text || text.trim().length < 80) {
        toast.error("Couldn't read enough text from this file", { id: "compare-upload" });
        // Best-effort cleanup if the storage upload succeeded.
        uploadPromise.then(({ error }) => {
          if (!error) supabase.storage.from("resumes").remove([path]);
        });
        return;
      }

      // Fingerprint the text so re-uploads of the same resume reuse the same
      // row (and therefore the same deterministic scores).
      const contentHash = await hashResumeText(text);
      const { data: existing } = await supabase
        .from("resumes")
        .select("id, file_name, file_path, created_at")
        .eq("user_id", user.id)
        .eq("content_hash", contentHash)
        .maybeSingle();

      let newRow: ResumeRow;

      if (existing) {
        // Same resume already exists — drop the duplicate upload and reuse it.
        uploadPromise.then(({ error }) => {
          if (!error) supabase.storage.from("resumes").remove([path]);
        });
        newRow = existing as ResumeRow;
        if (resumes.some((r) => r.id === newRow.id)) {
          toast.info("This resume is already in your compare list", { id: "compare-upload" });
          return;
        }
      } else {
        const { error: upErr } = await uploadPromise;
        if (upErr) throw upErr;

        const { data: inserted, error: insErr } = await supabase
          .from("resumes")
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: path,
            file_size: file.size,
            mime_type: extToMime(ext),
            raw_text: text,
            content_hash: contentHash,
          })
          .select("id, file_name, file_path, created_at")
          .single();
        if (insErr) throw insErr;
        newRow = inserted as ResumeRow;
      }
      setResumes((prev) => {
        if (prev.some((r) => r.id === newRow.id)) return prev;
        const next = [...prev, newRow];
        // Keep A = first uploaded, B = second uploaded.
        setAId(next[0]?.id ?? null);
        setBId(next[1]?.id ?? null);
        return next;
      });
      toast.success("Resume added", { id: "compare-upload" });
    } catch (e) {
      console.error(e);
      toast.error("Upload failed", { id: "compare-upload" });
    }
  };

  const runCompare = async () => {
    if (!aId || !bId) {
      toast.error("Pick two resumes to compare");
      return;
    }
    if (aId === bId) {
      toast.error("Pick two different resumes");
      return;
    }
    setComparing(true);
    setComparison(null);
    try {
      const { data, error } = await supabase.functions.invoke("compare-resumes", {
        body: {
          resume_a_id: aId,
          resume_b_id: bId,
          target_role: targetRole.trim() || undefined,
        },
      });
      if (error) {
        const msg = (error as any)?.message ?? "Comparison failed";
        if (msg.includes("Rate limit")) toast.error("Too many requests — try again in a moment");
        else if (msg.includes("credits")) toast.error("AI credits exhausted");
        else toast.error(msg);
        return;
      }
      if ((data as any)?.error) {
        toast.error((data as any).error);
        return;
      }
      setComparison((data as any).comparison);
      toast.success("Comparison ready");
    } catch (e) {
      toast.error("Couldn't compare resumes");
    } finally {
      setComparing(false);
    }
  };

  if (!ent.loading && !allowed) {
    return (
      <div className="max-w-[920px]">
        <Header />
        <UpgradeLock
          title="Compare resumes head-to-head"
          description="On Pro and above, you can compare any two resumes and see which one has a higher chance of landing an interview."
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] space-y-5">
      <Header />

      <SectionCard className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              Your two resumes
            </p>
            <p className="mt-1 text-[13.5px] text-foreground/65 tracking-tight">
              Resume A is your first upload, Resume B is your second. Upload another to replace B.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <UsageMeter feature="resume_uploads" label="Uploads" />
            <UploadButton onFile={handleUpload} />
          </div>
        </div>

        {loading ? (
          <p className="text-[13px] text-foreground/55">Loading your resumes…</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {resumes[0] ? (
              <ResumeSlot side="A" resume={resumes[0]} onDelete={handleDelete} />
            ) : (
              <EmptySlot side="A" hint="Upload your first resume to fill this slot." onFile={handleUpload} />
            )}
            {resumes[1] ? (
              <ResumeSlot side="B" resume={resumes[1]} onDelete={handleDelete} />
            ) : (
              <EmptySlot
                side="B"
                hint={
                  resumes.length === 0
                    ? "Upload Resume A first, then add a second one here."
                    : "Upload a second resume to compare against Resume A."
                }
                onFile={handleUpload}
                disabled={resumes.length === 0}
              />
            )}
          </div>
        )}

        <div>
          <label className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            Job you're applying for <span className="lowercase tracking-tight text-foreground/40">(optional)</span>
          </label>
          <input
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value.slice(0, 80))}
            placeholder="e.g. Senior Frontend Engineer"
            className="mt-2 w-full max-w-md px-3.5 py-2 rounded-lg bg-foreground/[0.03] border border-foreground/[0.1] text-[13.5px] outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={runCompare}
            disabled={comparing || !aId || !bId || aId === bId}
            className="px-5 py-2.5 rounded-full bg-foreground text-background text-[13px] font-medium tracking-tight hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {comparing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Comparing…
              </>
            ) : (
              <>
                <GitCompare className="w-3.5 h-3.5" />
                Compare
              </>
            )}
          </button>
          <span className="text-[11.5px] text-foreground/50 tracking-tight">
            Takes about 12 seconds.
          </span>
        </div>
      </SectionCard>

      {!comparison && (!aId || !bId) && (
        <EmptyState
          icon={GitCompare}
          title="Upload two resumes to compare"
          description="Drop in Resume A and Resume B — we'll grade them head-to-head and tell you which one is more likely to get the interview."
          preview={<PreviewCompare />}
        />
      )}

      {comparison && <ComparisonResult comparison={comparison} />}
    </div>
  );
};

const Header = () => (
  <div className="mb-1">
    <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
      Compare resumes
    </p>
    <h1 className="mt-1.5 text-[26px] sm:text-[30px] leading-[1.1] font-semibold tracking-[-0.025em]">
      Which resume is better?
    </h1>
    <p className="mt-1.5 text-[13.5px] text-foreground/60 tracking-tight max-w-[640px]">
      Upload two resumes. We'll tell you which one is more likely to get you the interview.
    </p>
    <ol className="mt-4 flex flex-wrap gap-2 text-[12px] text-foreground/70">
      <li className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/[0.04] border border-foreground/[0.08]">
        <span className="w-4 h-4 rounded-full bg-foreground text-background text-[10px] font-semibold inline-flex items-center justify-center">1</span>
        Upload Resume A
      </li>
      <li className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/[0.04] border border-foreground/[0.08]">
        <span className="w-4 h-4 rounded-full bg-foreground text-background text-[10px] font-semibold inline-flex items-center justify-center">2</span>
        Upload Resume B
      </li>
      <li className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/[0.04] border border-foreground/[0.08]">
        <span className="w-4 h-4 rounded-full bg-foreground text-background text-[10px] font-semibold inline-flex items-center justify-center">3</span>
        Click Compare
      </li>
    </ol>
  </div>
);

const UploadButton = ({ onFile }: { onFile: (f: File) => void }) => {
  return (
    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-foreground/[0.1] bg-foreground/[0.03] hover:bg-foreground/[0.06] text-[12.5px] font-medium tracking-tight text-foreground/80 cursor-pointer transition-colors">
      <Upload className="w-3.5 h-3.5" />
      Upload another resume
      <input
        type="file"
        accept={ACCEPTED_MIME.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
};

const ResumeSlot = ({
  side,
  resume,
  onDelete,
}: {
  side: "A" | "B";
  resume: ResumeRow;
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] p-3.5">
      <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
        Resume {side}
      </p>
      <div className="mt-2 flex items-center gap-2.5 rounded-lg bg-foreground text-background pl-3 pr-1.5 py-2.5">
        <FileText className="w-3.5 h-3.5 shrink-0 opacity-80" />
        <span className="truncate flex-1 text-[13px] tracking-tight font-medium">
          {resume.file_name}
        </span>
        <span className="text-[10.5px] shrink-0 text-background/60">
          {new Date(resume.created_at).toLocaleDateString()}
        </span>
        <button
          type="button"
          onClick={() => onDelete(resume.id)}
          className="shrink-0 w-7 h-7 rounded-md inline-flex items-center justify-center text-background/70 hover:bg-background/15 hover:text-background transition-colors"
          aria-label={`Delete ${resume.file_name}`}
          title="Delete resume"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const EmptySlot = ({
  side,
  hint,
  onFile,
  disabled,
}: {
  side: "A" | "B";
  hint: string;
  onFile: (f: File) => void;
  disabled?: boolean;
}) => {
  return (
    <label
      className={cn(
        "rounded-xl border border-dashed border-foreground/15 bg-foreground/[0.02] p-3.5 flex flex-col justify-between min-h-[96px] transition-colors",
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "cursor-pointer hover:bg-foreground/[0.04] hover:border-foreground/25",
      )}
    >
      <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
        Resume {side}
      </p>
      <div className="mt-2 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-foreground/[0.05] border border-foreground/[0.08] inline-flex items-center justify-center shrink-0">
          <Upload className="w-3.5 h-3.5 text-foreground/55" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium tracking-tight text-foreground/80">
            {disabled ? "Waiting for Resume A" : `Upload Resume ${side}`}
          </p>
          <p className="text-[11.5px] text-foreground/55 tracking-tight truncate">
            {hint}
          </p>
        </div>
      </div>
      <input
        type="file"
        accept={ACCEPTED_MIME.join(",")}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
};

const ComparisonResult = ({ comparison }: { comparison: Comparison }) => {
  const aWin = comparison.winner === "a";
  const bWin = comparison.winner === "b";
  const tie = comparison.winner === "tie";

  return (
    <div className="space-y-4">
      <SectionCard tone="dark" className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 60% at 80% 0%, hsl(40 90% 60% / 0.4), transparent 60%)",
          }}
        />
        <div className="relative flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <Trophy className="w-4.5 h-4.5 text-[hsl(40_95%_70%)]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-white/55 font-medium">
              Verdict
            </p>
            <h2 className="mt-1 text-[20px] sm:text-[24px] leading-[1.15] font-semibold tracking-[-0.02em]">
              {tie
                ? "It's a tie — both resumes land roughly the same."
                : aWin
                  ? `${comparison.resume_a.label} has the higher chance of getting interviewed.`
                  : `${comparison.resume_b.label} has the higher chance of getting interviewed.`}
            </h2>
            <p className="mt-2 text-[13.5px] leading-[1.55] text-white/75 tracking-tight max-w-2xl">
              {comparison.verdict}
            </p>
            {comparison.target_role && (
              <p className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] tracking-tight">
                <Sparkles className="w-3 h-3" />
                Compared for: {comparison.target_role}
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      <div className="grid sm:grid-cols-2 gap-4">
        <ResumeScoreCard
          side="A"
          score={comparison.resume_a}
          isWinner={aWin}
          isTie={tie}
        />
        <ResumeScoreCard
          side="B"
          score={comparison.resume_b}
          isWinner={bWin}
          isTie={tie}
        />
      </div>

      {comparison.key_differences.length > 0 && (
        <SectionCard>
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            Key differences
          </p>
          <div className="mt-3 space-y-2">
            {comparison.key_differences.map((d, i) => (
              <div
                key={i}
                className="grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr] gap-2 sm:gap-4 py-2.5 border-b border-foreground/[0.06] last:border-0"
              >
                <p className="text-[12.5px] font-medium tracking-tight text-foreground/85">
                  {d.dimension}
                </p>
                <p className="text-[12.5px] leading-[1.55] text-foreground/70 tracking-tight">
                  <span className="text-foreground/45 mr-1.5">A:</span>
                  {d.resume_a}
                </p>
                <p className="text-[12.5px] leading-[1.55] text-foreground/70 tracking-tight">
                  <span className="text-foreground/45 mr-1.5">B:</span>
                  {d.resume_b}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {comparison.recommendations_for_loser.length > 0 && !tie && (
        <SectionCard>
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            How to close the gap
          </p>
          <p className="mt-1 text-[12.5px] text-foreground/55 tracking-tight">
            Specific edits for {aWin ? comparison.resume_b.label : comparison.resume_a.label} to
            catch up.
          </p>
          <ul className="mt-3 space-y-1.5">
            {comparison.recommendations_for_loser.map((r, i) => (
              <li
                key={i}
                className="text-[13px] leading-[1.55] text-foreground/80 pl-4 relative tracking-tight"
              >
                <span className="absolute left-0 top-[9px] w-1.5 h-1.5 rounded-full bg-[hsl(258_45%_58%)]" />
                {r}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
};

const ResumeScoreCard = ({
  side,
  score,
  isWinner,
  isTie,
}: {
  side: "A" | "B";
  score: SideScore;
  isWinner: boolean;
  isTie: boolean;
}) => {
  return (
    <SectionCard
      className={cn(
        "relative",
        isWinner &&
          "ring-2 ring-[hsl(40_95%_55%)] ring-offset-2 ring-offset-background",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            Resume {side}
          </p>
          <p className="mt-1 text-[14px] font-semibold tracking-tight truncate">{score.label}</p>
        </div>
        {isWinner && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(40_95%_55%/0.18)] text-[hsl(40_70%_28%)] text-[10.5px] font-semibold tracking-[0.06em] uppercase shrink-0">
            <Trophy className="w-3 h-3" />
            Winner
          </span>
        )}
        {isTie && (
          <span className="px-2 py-0.5 rounded-full bg-foreground/[0.06] text-foreground/55 text-[10.5px] font-semibold tracking-[0.06em] uppercase shrink-0">
            Tie
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <ScoreCell label="Overall" value={score.overall_score} big />
        <ScoreCell label="Interview chance" value={score.interview_chance} big accent />
        <ScoreCell label="ATS" value={score.ats_score} />
        <ScoreCell label="Impact" value={score.impact_score} />
        <ScoreCell label="Relevance" value={score.relevance_score} />
      </div>

      {score.strengths.length > 0 && (
        <div className="mt-4">
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            Strengths
          </p>
          <ul className="mt-1.5 space-y-1">
            {score.strengths.map((s, i) => (
              <li key={i} className="text-[12.5px] leading-[1.5] text-foreground/75 pl-3 relative tracking-tight">
                <span className="absolute left-0 top-[8px] w-1 h-1 rounded-full bg-[hsl(150_55%_45%)]" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {score.weaknesses.length > 0 && (
        <div className="mt-3">
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            Areas to improve
          </p>
          <ul className="mt-1.5 space-y-1">
            {score.weaknesses.map((s, i) => (
              <li key={i} className="text-[12.5px] leading-[1.5] text-foreground/75 pl-3 relative tracking-tight">
                <span className="absolute left-0 top-[8px] w-1 h-1 rounded-full bg-[hsl(35_92%_55%)]" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
};

const ScoreCell = ({
  label,
  value,
  big,
  accent,
}: {
  label: string;
  value: number;
  big?: boolean;
  accent?: boolean;
}) => (
  <div
    className={cn(
      "rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] px-3 py-2.5",
      big && "col-span-1",
    )}
  >
    <p className="text-[10px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
      {label}
    </p>
    <p
      className={cn(
        "mt-0.5 font-semibold tracking-[-0.02em]",
        big ? "text-[22px]" : "text-[16px]",
        accent && "text-[hsl(258_45%_55%)]",
      )}
    >
      {Math.round(value)}
      <span className="text-[12px] font-normal text-foreground/45 ml-0.5">/100</span>
    </p>
  </div>
);

export default CompareResumes;
