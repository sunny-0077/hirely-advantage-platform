import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, FileText, X, Sparkles, ScanSearch, Target, Clock } from "lucide-react";
import GapResult from "@/components/dashboard/gap/GapResult";
import { toast } from "sonner";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { RoleSuggestInput } from "@/components/dashboard/RoleSuggestInput";
import { supabase } from "@/integrations/supabase/client";
import {
  ACCEPTED_EXTS,
  ACCEPTED_MIME,
  MAX_FILE_BYTES,
  extToMime,
  extractResumeText,
} from "@/lib/resumeParser";
import { cn } from "@/lib/utils";

const SHARED_JD_KEY = "lovable.shared_jd";

export default function GapAnalysis() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [jd, setJd] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [yearsExp, setYearsExp] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [carriedJd, setCarriedJd] = useState(false);

  // Carry JD forward from previous feature (e.g. ATS Optimizer)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SHARED_JD_KEY);
      if (saved && saved.trim().length > 40) {
        setJd(saved);
        setCarriedJd(true);
      }
    } catch {}
  }, []);

  // Persist JD as user edits so it can carry forward elsewhere
  useEffect(() => {
    try {
      if (jd.trim().length > 0) sessionStorage.setItem(SHARED_JD_KEY, jd);
    } catch {}
  }, [jd]);

  const onFile = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) return toast.error("File too large. Max 10 MB.");
    const mime = file.type || extToMime(file.name) || "";
    if (!ACCEPTED_MIME.includes(mime)) return toast.error("Use PDF, DOCX or TXT.");
    setExtracting(true);
    try {
      const text = await extractResumeText(file);
      if (!text || text.length < 80) {
        toast.error("Couldn't read enough text. Try a different file.");
        return;
      }
      setResumeText(text);
      setFileName(file.name);
    } catch (e) {
      console.error(e);
      toast.error("Failed to read file.");
    } finally {
      setExtracting(false);
    }
  };

  const run = async () => {
    if (resumeText.trim().length < 80) return toast.error("Upload a resume first.");
    if (jd.trim().length < 40) return toast.error("Paste a longer job description.");
    setRunning(true);
    setMarkdown(null);
    try {
      const yoe = yearsExp.trim() === "" ? undefined : Math.max(0, Math.min(60, Number(yearsExp)));
      const { data, error } = await supabase.functions.invoke("gap-analysis", {
        body: {
          resume_text: resumeText,
          job_description: jd,
          target_role: targetRole.trim() || undefined,
          years_experience: Number.isFinite(yoe as number) ? yoe : undefined,
        },
      });
      if (error) throw new Error(error.message || "Failed");
      const md = data as { markdown?: string; error?: string } | null;
      if (md?.error) throw new Error(md.error);
      if (!md?.markdown) throw new Error("Empty response");
      setMarkdown(md.markdown);
      toast.success("Gap analysis ready.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setResumeText("");
    setFileName(null);
    setJd("");
    setTargetRole("");
    setYearsExp("");
    setMarkdown(null);
    setCarriedJd(false);
    try { sessionStorage.removeItem(SHARED_JD_KEY); } catch {}
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Job Gap Analysis"
        title="The honest gap between you and the role."
        description="Paste a job description, tell us the target role and your seniority — we'll map every requirement to evidence in your resume, line by line."
        statusLabel="Evidence-mapped, line by line"
      />


      <div className="grid md:grid-cols-2 gap-5">
        <SectionCard className="p-0 overflow-hidden">
          <button
            type="button"
            onClick={() => !extracting && inputRef.current?.click()}
            disabled={extracting}
            className="w-full text-left p-6 sm:p-7"
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center",
                  fileName
                    ? "bg-foreground/5"
                    : "bg-gradient-to-br from-[#0E0B1F] to-[#3a2d5e] text-white",
                )}
              >
                {extracting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-foreground/70" />
                ) : fileName ? (
                  <FileText className="w-4 h-4 text-foreground/70" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                  Step 1 — Resume
                </p>
                <p className="mt-1 text-[15px] leading-snug font-medium tracking-tight text-foreground truncate">
                  {extracting ? "Reading resume…" : fileName ?? "Upload PDF, DOCX or TXT"}
                </p>
                <p className="mt-1 text-[12px] text-foreground/55">
                  We read your resume locally before sending it for analysis.
                </p>
              </div>
              {fileName && !extracting && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFileName(null);
                    setResumeText("");
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="shrink-0 w-7 h-7 rounded-full hover:bg-foreground/5 flex items-center justify-center text-foreground/60"
                  aria-label="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTS.join(",")}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </SectionCard>

        <SectionCard className="p-0 overflow-hidden">
          <div className="p-6 sm:p-7">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                Step 2 — Job description
              </p>
              {carriedJd && (
                <span className="text-[10.5px] tracking-[0.16em] uppercase font-medium text-foreground/55 bg-foreground/[0.05] border border-foreground/[0.06] px-2 py-0.5 rounded-full">
                  Carried over
                </span>
              )}
            </div>
            <p className="mt-1 text-[15px] leading-snug font-medium tracking-tight text-foreground">
              Paste the full posting
            </p>
            <textarea
              value={jd}
              onChange={(e) => {
                setJd(e.target.value);
                if (carriedJd) setCarriedJd(false);
              }}
              placeholder="Paste the job description here…"
              className="mt-3 w-full min-h-[140px] resize-y bg-transparent border border-foreground/[0.08] rounded-xl p-3 text-[13px] text-foreground placeholder:text-foreground/35 outline-none focus:border-foreground/25 transition-colors"
            />
            <p className="mt-1.5 text-[11.5px] text-foreground/45">
              {jd.trim().length} chars{jd.trim().length < 40 && " — paste more for a useful result"}
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard className="p-6 sm:p-7">
        <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
          Step 3 — About the role
        </p>
        <p className="mt-1 text-[15px] leading-snug font-medium tracking-tight text-foreground">
          Tell us what you're aiming for
        </p>

        <div className="mt-4 grid md:grid-cols-[1fr,200px] gap-4">
          <div>
            <label
              htmlFor="gap-target-role"
              className="text-[11px] tracking-[0.14em] uppercase text-foreground/55 font-medium flex items-center gap-1.5"
            >
              <Target className="w-3 h-3" />
              Target role
            </label>
            <div className="mt-2">
              <RoleSuggestInput
                id="gap-target-role"
                value={targetRole}
                onChange={setTargetRole}
                placeholder="e.g. Senior Product Manager"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="gap-yoe"
              className="text-[11px] tracking-[0.14em] uppercase text-foreground/55 font-medium flex items-center gap-1.5"
            >
              <Clock className="w-3 h-3" />
              Years of experience
            </label>
            <div className="relative mt-2">
              <input
                id="gap-yoe"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                value={yearsExp}
                onChange={(e) => setYearsExp(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                placeholder="e.g. 5"
                className="w-full bg-foreground/[0.03] border border-foreground/[0.06] rounded-lg px-3 py-2 pr-12 text-[13px] text-foreground placeholder:text-foreground/35 outline-none focus:border-foreground/20 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-foreground/40">
                yrs
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={running || extracting}
          className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2.5 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {running ? "Analyzing fit…" : markdown ? "Re-run analysis" : "Run gap analysis"}
        </button>
        {(resumeText || jd || markdown || targetRole || yearsExp) && (
          <button
            type="button"
            onClick={reset}
            className="text-[12.5px] text-foreground/60 hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {markdown && <GapResult markdown={markdown} />}
    </div>
  );
}
