import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Upload, FileText, X, Target, Check, AlertTriangle, Sparkles, Lock, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { supabase } from "@/integrations/supabase/client";
import {
  ACCEPTED_EXTS,
  ACCEPTED_MIME,
  MAX_FILE_BYTES,
  extToMime,
  extractResumeText,
} from "@/lib/resumeParser";
import { useEntitlements } from "@/hooks/useEntitlements";
import { PLAN_LABEL } from "@/lib/entitlements";
import { UpgradePlanDialog } from "@/components/dashboard/UpgradePlanDialog";
import { cn } from "@/lib/utils";

type Keyword = {
  keyword: string;
  category:
    | "technical_skill"
    | "tool"
    | "role_keyword"
    | "soft_skill"
    | "certification"
    | "industry_term";
  importance: "must_have" | "nice_to_have";
  found_in_resume: boolean;
  evidence_in_resume: boolean;
};

type Suggestion = {
  keyword: string;
  recommendation: "add" | "skip";
  where_to_add: string;
  reason: string;
};

type Rewrite = {
  before: string;
  after: string;
  keywords_added: string[];
  why: string;
};

type Result = {
  match_before: number;
  match_after: number;
  summary: string;
  jd_keywords: Keyword[];
  suggestions: Suggestion[];
  bullet_rewrites: Rewrite[];
};

const CATEGORY_LABEL: Record<Keyword["category"], string> = {
  technical_skill: "Technical skill",
  tool: "Tool",
  role_keyword: "Role keyword",
  soft_skill: "Soft skill",
  certification: "Certification",
  industry_term: "Industry term",
};

export default function AtsOptimizer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const ent = useEntitlements();
  const allowed = ent.unlocked("ats_breakdown");

  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [jd, setJdState] = useState<string>(() => {
    try { return sessionStorage.getItem("lovable.shared_jd") ?? ""; } catch { return ""; }
  });
  const setJd = (next: string) => {
    setJdState(next);
    try {
      if (next.trim()) sessionStorage.setItem("lovable.shared_jd", next);
    } catch {}
  };
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

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
    if (!allowed) {
      setShowUpgrade(true);
      return;
    }
    if (resumeText.trim().length < 80) return toast.error("Upload a resume first.");
    if (jd.trim().length < 40) return toast.error("Paste a longer job description.");
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ats-optimize", {
        body: { resume_text: resumeText, job_description: jd },
      });
      const code =
        (data as { code?: string } | null)?.code ||
        (error as { context?: { code?: string } } | null)?.context?.code;
      if (code === "OVER_QUOTA") {
        setShowUpgrade(true);
        return;
      }
      if (error) throw new Error(error.message || "Failed");
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult((data as any).result as Result);
      toast.success("Keyword analysis ready.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setResumeText("");
    setFileName(null);
    setJd("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="ATS Keyword Optimizer"
        title="Beat the bots — without keyword stuffing."
        description="Upload your resume, paste the job description, and we'll find the missing keywords that matter — only suggesting edits your real experience supports."
        statusLabel="Keyword match against your JD"
      />


      {!ent.loading && !allowed && (
        <SectionCard className="flex items-center gap-4">
          <span className="w-9 h-9 rounded-xl bg-foreground/[0.06] flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-foreground/55" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-medium tracking-tight text-foreground">
              ATS Optimizer is a Pro feature
            </p>
            <p className="text-[12px] text-foreground/60">
              You're on the {PLAN_LABEL[ent.plan]} plan. Upgrade to unlock unlimited keyword optimization runs.
            </p>
          </div>
          <Link
            to="/app/upgrade"
            className="shrink-0 text-[12px] font-medium px-3.5 py-2 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            Upgrade
          </Link>
        </SectionCard>
      )}

      {/* Inputs */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Resume upload */}
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
                  {extracting
                    ? "Reading resume…"
                    : fileName ?? "Upload PDF, DOCX or TXT"}
                </p>
                <p className="mt-1 text-[12px] text-foreground/55">
                  We extract skills, tools, experience and education locally.
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

        {/* JD paste */}
        <SectionCard className="p-0 overflow-hidden">
          <div className="p-6 sm:p-7">
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              Step 2 — Job description
            </p>
            <p className="mt-1 text-[15px] leading-snug font-medium tracking-tight text-foreground">
              Paste the full posting
            </p>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description here…"
              className="mt-3 w-full min-h-[140px] resize-y bg-transparent border border-foreground/[0.08] rounded-xl p-3 text-[13px] text-foreground placeholder:text-foreground/35 outline-none focus:border-foreground/25 transition-colors"
            />
            <p className="mt-1.5 text-[11.5px] text-foreground/45">
              {jd.trim().length} chars{jd.trim().length < 40 && " — paste more for a useful result"}
            </p>
          </div>
        </SectionCard>
      </div>

      {/* Run / Reset */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={running || extracting}
          className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2.5 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {running ? "Analyzing keywords…" : result ? "Re-run analysis" : "Optimize for ATS"}
        </button>
        {(resumeText || jd || result) && (
          <button
            type="button"
            onClick={reset}
            className="text-[12.5px] text-foreground/60 hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results */}
      {result && <ResultsView result={result} />}

      <UpgradePlanDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={ent.plan}
        feature="ats_breakdown"
      />
    </div>
  );
}

function ResultsView({ result }: { result: Result }) {
  const total = result.jd_keywords.length;
  const found = result.jd_keywords.filter((k) => k.found_in_resume).length;
  const missing = result.jd_keywords.filter((k) => !k.found_in_resume);

  // Keyword Safety Score — % of suggested keywords backed by real resume evidence.
  const sugTotal = result.suggestions.length;
  const sugAdd = result.suggestions.filter((s) => s.recommendation === "add").length;
  const sugSkip = sugTotal - sugAdd;
  const safety = sugTotal === 0 ? 100 : Math.round((sugAdd / sugTotal) * 100);
  const safetyTone: "good" | "warn" | "risk" =
    safety >= 85 ? "good" : safety >= 60 ? "warn" : "risk";

  return (
    <div className="space-y-4">
      {/* Top row: score + safety side-by-side */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Score before/after */}
        <SectionCard tone="dark" className="p-6 sm:p-7 relative overflow-hidden">
          <div
            className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-60"
            style={{ background: "radial-gradient(closest-side, rgba(140,110,220,0.35), transparent)" }}
          />
          <div className="relative">
            <p className="text-[10.5px] tracking-[0.22em] uppercase text-white/60 font-medium">
              Match score
            </p>
            <div className="mt-3 flex items-end gap-8 flex-wrap">
              <ScorePill label="Now" value={result.match_before} tone="muted" />
              <div className="flex items-end pb-3 text-white/35 text-[22px]">→</div>
              <ScorePill label="After fixes" value={result.match_after} tone="bright" />
            </div>
            <p className="mt-4 text-[13px] text-white/80 leading-relaxed max-w-xl">
              {result.summary}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-[12px]">
              <Stat label="Scanned" value={String(total)} />
              <Stat label="Found" value={`${found}`} accent="ok" />
              <Stat label="Missing" value={`${missing.length}`} accent={missing.length ? "warn" : "ok"} />
            </div>
          </div>
        </SectionCard>

        {/* Safety */}
        <SafetyCard
          score={safety}
          tone={safetyTone}
          addCount={sugAdd}
          skipCount={sugSkip}
          total={sugTotal}
        />
      </div>

      {/* Keyword grid */}
      <SectionCard className="p-6 sm:p-7">
        <p className="text-[10.5px] tracking-[0.22em] uppercase text-foreground/55 font-medium">
          Resume vs job description
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <KeywordColumn title="Found in your resume" tone="ok"
            items={result.jd_keywords.filter((k) => k.found_in_resume)} />
          <KeywordColumn title="Missing keywords" tone="warn"
            items={result.jd_keywords.filter((k) => !k.found_in_resume)} />
        </div>
      </SectionCard>

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <SectionCard className="p-6 sm:p-7">
          <p className="text-[10.5px] tracking-[0.22em] uppercase text-foreground/55 font-medium">
            What to do about each missing keyword
          </p>
          <ul className="mt-4 space-y-2.5">
            {result.suggestions.map((s, i) => {
              const add = s.recommendation === "add";
              return (
                <li
                  key={i}
                  className={cn(
                    "rounded-xl border p-4 transition-colors",
                    add
                      ? "border-emerald-500/20 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.07]"
                      : "border-amber-500/25 bg-amber-500/[0.05] hover:bg-amber-500/[0.08]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5",
                        add
                          ? "bg-emerald-500/15 text-emerald-700"
                          : "bg-amber-500/15 text-amber-700",
                      )}
                    >
                      {add ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold tracking-tight text-foreground">
                          {s.keyword}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] tracking-[0.14em] uppercase px-2 py-0.5 rounded-full font-semibold",
                            add
                              ? "bg-emerald-500/15 text-emerald-800"
                              : "bg-amber-500/15 text-amber-800",
                          )}
                        >
                          {add ? "Add naturally" : "Skip — no real evidence"}
                        </span>
                      </div>
                      {add && (
                        <p className="mt-1.5 text-[12.5px] text-foreground/75">
                          <span className="font-semibold text-foreground/90">Where:</span>{" "}
                          {s.where_to_add}
                        </p>
                      )}
                      <p className="mt-1 text-[12.5px] text-foreground/75 leading-relaxed">{s.reason}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      {/* Bullet rewrites */}
      {result.bullet_rewrites.length > 0 && (
        <SectionCard>
          <p className="text-[10.5px] tracking-[0.22em] uppercase text-foreground/45 font-medium">
            Natural rewrites (no stuffing)
          </p>
          <ul className="mt-4 space-y-4">
            {result.bullet_rewrites.map((r, i) => (
              <li key={i} className="rounded-xl border border-foreground/[0.06] p-4 bg-foreground/[0.02]">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] tracking-[0.18em] uppercase text-foreground/45 font-medium">Before</p>
                    <p className="mt-1 text-[12.5px] text-foreground/70 leading-relaxed">{r.before}</p>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.18em] uppercase text-emerald-700 font-medium">After</p>
                    <p className="mt-1 text-[12.5px] text-foreground leading-relaxed">{r.after}</p>
                  </div>
                </div>
                {r.keywords_added.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.keywords_added.map((k) => (
                      <span
                        key={k}
                        className="text-[10.5px] px-2 py-0.5 rounded-full bg-foreground/[0.06] text-foreground/75"
                      >
                        +{k}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[11.5px] text-foreground/55">{r.why}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

function SafetyCard({
  score,
  tone,
  addCount,
  skipCount,
  total,
}: {
  score: number;
  tone: "good" | "warn" | "risk";
  addCount: number;
  skipCount: number;
  total: number;
}) {
  const palette = {
    good: {
      ring: "text-emerald-600",
      track: "text-emerald-500/15",
      chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
      icon: ShieldCheck,
      headline: "Most suggested keywords are supported by your resume content.",
    },
    warn: {
      ring: "text-amber-600",
      track: "text-amber-500/15",
      chip: "bg-amber-500/10 text-amber-700 border-amber-500/20",
      icon: ShieldAlert,
      headline: "Some suggested keywords need a closer look before you add them.",
    },
    risk: {
      ring: "text-rose-600",
      track: "text-rose-500/15",
      chip: "bg-rose-500/10 text-rose-700 border-rose-500/20",
      icon: ShieldAlert,
      headline: "Several suggested keywords aren't backed by your current resume.",
    },
  }[tone];

  const Icon = palette.icon;
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;

  return (
    <SectionCard>
      <div className="flex items-start gap-5 flex-wrap">
        {/* Ring */}
        <div className="relative w-[76px] h-[76px] shrink-0">
          <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              strokeWidth="6"
              className={cn("stroke-current", palette.track)}
            />
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              className={cn("stroke-current transition-all", palette.ring)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[16px] font-medium tracking-tight text-foreground">
              {score}
              <span className="text-[10px] text-foreground/45 ml-0.5">%</span>
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className={cn("w-4 h-4", palette.ring)} />
            <p className="text-[10.5px] tracking-[0.22em] uppercase text-foreground/55 font-medium">
              Keyword Safety Score
            </p>
          </div>
          <p className="mt-1.5 text-[15px] leading-snug font-medium tracking-tight text-foreground">
            {total === 0
              ? "No keywords flagged — your resume already covers the role."
              : palette.headline}
          </p>
          {skipCount > 0 && (
            <div
              className={cn(
                "mt-3 inline-flex items-center gap-2 text-[12px] px-2.5 py-1 rounded-full border",
                palette.chip,
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Warning: {skipCount} keyword{skipCount === 1 ? "" : "s"} need
              {skipCount === 1 ? "s" : ""} your confirmation before adding.
            </div>
          )}
          <p className="mt-2 text-[11.5px] text-foreground/55">
            {addCount} of {total} suggested keywords are backed by real evidence in your resume.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

function ScorePill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "muted" | "bright";
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.18em] uppercase text-white/55 font-medium">{label}</p>
      <p
        className={cn(
          "mt-1 text-[44px] leading-none font-semibold tracking-tight",
          tone === "bright"
            ? "bg-gradient-to-br from-white to-violet-200 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(180,150,255,0.35)]"
            : "text-white/55",
        )}
      >
        {Math.round(value)}
        <span className="text-[16px] text-white/45 ml-0.5 font-medium">%</span>
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "ok" | "warn";
}) {
  const accentClass =
    accent === "ok"
      ? "text-emerald-300"
      : accent === "warn"
      ? "text-amber-300"
      : "text-white";
  return (
    <div className="rounded-xl bg-white/[0.06] border border-white/10 px-3.5 py-2.5 backdrop-blur-sm">
      <p className="text-[10px] tracking-[0.18em] uppercase text-white/55 font-medium">{label}</p>
      <p className={cn("mt-0.5 text-[18px] font-semibold tracking-tight", accentClass)}>{value}</p>
    </div>
  );
}

function KeywordColumn({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "ok" | "warn";
  items: Keyword[];
}) {
  const isOk = tone === "ok";
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        isOk
          ? "border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.07] to-emerald-500/[0.02]"
          : "border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] to-amber-500/[0.02]",
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center",
            isOk ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700",
          )}
        >
          {isOk ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
        </span>
        <p className="text-[12px] font-semibold tracking-tight text-foreground">
          {title}
        </p>
        <span
          className={cn(
            "ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full",
            isOk ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700",
          )}
        >
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-foreground/50">None.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((k) => (
            <span
              key={k.keyword}
              title={`${CATEGORY_LABEL[k.category]} · ${k.importance.replace("_", " ")}`}
              className={cn(
                "text-[11.5px] px-2.5 py-1 rounded-full border transition-colors",
                isOk
                  ? "bg-emerald-500/12 border-emerald-500/30 text-emerald-800"
                  : "bg-amber-500/12 border-amber-500/30 text-amber-800",
                k.importance === "must_have" && "font-semibold ring-1 ring-inset",
                k.importance === "must_have" && (isOk ? "ring-emerald-500/30" : "ring-amber-500/30"),
              )}
            >
              {k.keyword}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
