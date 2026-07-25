import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, Search, Mail, Mic, Target, RefreshCw, ArrowUpRight, Sparkles, FileText } from "lucide-react";
import { EmptyState, PreviewScoreCard } from "@/components/dashboard/EmptyState";
import { SegmentedTabs } from "@/components/dashboard/SegmentedTabs";
import { SectionCard } from "@/components/dashboard/SectionCard";


import { InsightsTriad, type InsightsColumn } from "@/components/dashboard/InsightsTriad";
import { QuickWins, type QuickWin } from "@/components/dashboard/QuickWins";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ResumeUploadCard } from "@/components/dashboard/ResumeUploadCard";
import { TailoredEditsPanel } from "@/components/dashboard/TailoredEditsPanel";
import { TransformationPanel } from "@/components/dashboard/TransformationPanel";
import { EnhancedResumePanel } from "@/components/dashboard/EnhancedResumePanel";
import { UpgradeLock } from "@/components/dashboard/UpgradeLock";
import { UpgradePlanDialog } from "@/components/dashboard/UpgradePlanDialog";

import { useEntitlements } from "@/hooks/useEntitlements";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Weakness = {
  category:
    | "lack_of_metrics"
    | "weak_action_verbs"
    | "too_generic"
    | "missing_summary"
    | "skills_mismatch"
    | "ats_formatting"
    | "grammar"
    | "other";
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

type Analysis = {
  id: string;
  resume_id: string;
  overall_score: number;
  ats_score: number;
  summary: string;
  target_role?: string | null;
  extracted: {
    name?: string;
    headline?: string;
    skills?: string[];
    keywords?: string[];
    experience?: { title: string; company: string; dates?: string; bullets?: string[] }[];
    projects?: { name: string; description?: string }[];
    education?: { degree: string; school: string; dates?: string }[];
    achievements?: string[];
  };
  issues: {
    missing_sections?: string[];
    weak_bullets?: { text: string; reason: string }[];
    grammar_issues?: string[];
    formatting_problems?: string[];
    ats_problems?: string[];
  };
  insights: {
    strengths?: string[];
    gaps?: string[];
    risks?: string[];
  };
  quick_wins: { title: string; detail: string; impact: "high" | "medium" | "low" }[];
  strengths?: { title: string; detail: string }[];
  weaknesses?: Weakness[];
  bullet_rewrites?: { before: string; after: string; why: string }[];
  score_breakdown?: {
    ats_compatibility?: number;
    impact_statements?: number;
    relevance?: number;
    clarity?: number;
    keyword_match?: number;
  };
  job_match?: {
    target_role?: string;
    match_percent?: number;
    target_percent?: number;
    missing_requirements?: string[];
    matched_requirements?: string[];
  };
  created_at: string;
};

const tabs = [
  { value: "score", label: "Score" },
  { value: "enhanced", label: "Enhanced" },
  
  { value: "extracted", label: "Extracted" },
  { value: "issues", label: "Issues" },
  { value: "tailored", label: "Tailored" },
  { value: "versions", label: "History" },
];

const today = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const impactToLift: Record<string, string> = {
  high: "+5 pts",
  medium: "+3 pts",
  low: "+1 pt",
};

const ResumeAnalyzer = () => {
  const { user } = useAuth();
  const ent = useEntitlements();
  const isFree = ent.plan === "free";
  const [tab, setTab] = useState("score");
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestCached, setLatestCached] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const latest = analyses[0];

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("resume_analyses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      toast.error("Couldn't load analyses");
    } else {
      setAnalyses((data ?? []) as unknown as Analysis[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleAnalyzed = async (_id: string, meta?: { cached?: boolean }) => {
    setLatestCached(!!meta?.cached);
    setShowUploader(false);
    await refresh();
    setTab("score");
  };

  const handleReanalyze = async () => {
    if (!latest) return;
    if (!ent.can("analyses")) {
      toast.error("You've reached your monthly analysis limit.");
      return;
    }
    setReanalyzing(true);
    try {
      const { data: resume } = await supabase
        .from("resumes")
        .select("raw_text")
        .eq("id", latest.resume_id)
        .maybeSingle();
      if (!resume?.raw_text) throw new Error("Resume text unavailable");
      const { data: fnData, error: fnErr } = await supabase.functions.invoke(
        "analyze-resume",
        {
          body: {
            resume_id: latest.resume_id,
            raw_text: resume.raw_text,
            target_role: latest.target_role || undefined,
          },
        },
      );
      if (fnErr) throw new Error(fnErr.message || "Analysis failed");
      if (fnData?.error) throw new Error(fnData.error);
      toast.success("Fresh analysis ready.");
      setLatestCached(false);
      await refresh();
      ent.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Re-analysis failed");
    } finally {
      setReanalyzing(false);
    }
  };

  const insightsColumns: InsightsColumn[] | undefined = useMemo(() => {
    if (!latest) return undefined;
    const ins = latest.insights ?? {};
    return [
      {
        label: "Strengths",
        tone: "green",
        items: (ins.strengths ?? []).slice(0, 3).map((t) => ({ text: t })),
      },
      {
        label: "Gaps",
        tone: "amber",
        items: (ins.gaps ?? []).slice(0, 3).map((t) => ({ text: t })),
      },
      {
        label: "Risks",
        tone: "violet",
        items: (ins.risks ?? []).slice(0, 3).map((t) => ({ text: t })),
      },
    ];
  }, [latest]);

  const quickWins: QuickWin[] | undefined = useMemo(() => {
    if (!latest?.quick_wins?.length) return undefined;
    const cap = isFree ? 2 : 3;
    return latest.quick_wins.slice(0, cap).map((w, i) => ({
      id: `qw-${i}`,
      title: w.title,
      detail: w.detail,
      lift: impactToLift[w.impact] ?? "+2 pts",
      effort: w.impact === "high" ? "1 min" : w.impact === "medium" ? "45 sec" : "30 sec",
    }));
  }, [latest, isFree]);
  const handleSignOut = async () => {
    // Wipe any client-side drafts so the next user on this device starts fresh.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("hirely."))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    await supabase.auth.signOut();
  };

  return (
    <div className="max-w-[1180px] mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-[10.5px] tracking-[0.22em] uppercase text-foreground/40 font-medium">
          {today}
        </p>
        <div className="flex items-center gap-2">
          
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              className="pl-8 pr-3 py-1.5 rounded-full bg-card/55 backdrop-blur border border-white/70 text-[12px] text-foreground/70 placeholder:text-foreground/40 outline-none w-44 focus:ring-2 focus:ring-foreground/10"
              placeholder="Search ⌘K"
            />
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="w-8 h-8 rounded-full bg-card/70 border border-white/70 backdrop-blur flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-card transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-foreground to-[#3a2d5e] flex items-center justify-center text-background text-[11px] font-semibold uppercase">
            {(user?.email?.[0] ?? "U")}
          </div>
        </div>
      </div>

      {/* Headline + companion */}
      <div className="mt-3 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-end">
        <h1 className="text-[36px] sm:text-[44px] leading-[1.04] font-semibold tracking-[-0.035em] text-foreground">
          From ignored to{" "}
          <span
            style={{
              background: "linear-gradient(120deg,#0E0B1F,#6D54B3,#0E0B1F)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            interviewed
          </span>
          .
        </h1>

        {latest && (
          <HeadlineCompanion
            createdAt={latest.created_at}
            score={latest.overall_score}
            count={analyses.length}
          />
        )}
      </div>

      {/* Upload — shows on first run, or when user clicks "Analyze new resume" */}
      {user && (!latest || showUploader) && (
        <div className="mt-5">
          {latest && showUploader && (
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11.5px] tracking-tight text-foreground/55">
                Upload a new or updated resume to run a fresh analysis.
              </p>
              <button
                type="button"
                onClick={() => setShowUploader(false)}
                className="text-[11.5px] text-foreground/55 hover:text-foreground tracking-tight"
              >
                Cancel
              </button>
            </div>
          )}
          <ResumeUploadCard userId={user.id} onAnalyzed={handleAnalyzed} />
        </div>
      )}

      {/* Quick actions when an analysis already exists */}
      {latest && !showUploader && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!ent.can("resume_uploads") || !ent.can("analyses")) {
                setShowUpgrade(true);
                return;
              }
              setShowUploader(true);
            }}
            className="px-4 py-2 rounded-full bg-foreground text-background text-[12.5px] font-medium tracking-tight hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analyze new resume
          </button>
          <button
            type="button"
            onClick={handleReanalyze}
            disabled={reanalyzing}
            className="px-4 py-2 rounded-full border border-foreground/10 text-foreground/75 text-[12.5px] tracking-tight hover:bg-foreground/5 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", reanalyzing && "animate-spin")} />
            {reanalyzing ? "Re-running…" : "Re-run on current resume"}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 overflow-x-auto">
        <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />
      </div>

      {!latest && !loading && (
        <SectionCard className="mt-5">
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            No analysis yet
          </p>
          <p className="mt-2 text-[18px] tracking-tight text-foreground/75">
            Upload your resume above and we'll review it like a hiring manager —
            extract skills, score ATS compatibility, and surface the top fixes.
          </p>
        </SectionCard>
      )}

      {/* SCORE TAB — scan-first: hero, then act, then optional deep dives */}
      {tab === "score" && latest && (
        <>
          {/* HERO — everything that matters at a glance, in one card */}
          <SectionCard className="mt-5">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_220px] gap-5 lg:gap-7 items-end">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                    Resume readiness
                  </p>
                  {latestCached && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-foreground/[0.05] border border-foreground/[0.08] text-[10.5px] tracking-tight text-foreground/65">
                      <span className="w-1 h-1 rounded-full bg-foreground/40" />
                      Loaded from cache
                      <button
                        type="button"
                        onClick={handleReanalyze}
                        disabled={reanalyzing}
                        className="ml-0.5 font-medium text-foreground/85 hover:text-foreground underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        {reanalyzing ? "Re-running…" : "Re-run"}
                      </button>
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[64px] sm:text-[72px] leading-none font-semibold tracking-[-0.045em] text-foreground tabular-nums">
                  {latest.overall_score}
                  <span className="text-[22px] text-foreground/30 tracking-tight">/100</span>
                </p>
                <p className="mt-3 text-[13.5px] leading-[1.5] text-foreground/70 tracking-tight max-w-xl">
                  {latest.summary || "Your latest review."}
                </p>
              </div>

              {/* Inline stat pills — no separate StatStrip card */}
              <div className="grid grid-cols-2 lg:grid-cols-2 gap-2 md:gap-2.5 lg:max-w-[260px] w-full lg:w-auto">
                <MiniStat label="ATS" value={`${latest.ats_score}`} accent={latest.ats_score >= 80} />
                <MiniStat
                  label="Match"
                  value={
                    latest.job_match?.match_percent != null
                      ? `${Math.round(latest.job_match.match_percent)}%`
                      : "—"
                  }
                />
                <MiniStat label="Skills" value={`${latest.extracted?.skills?.length ?? 0}`} />
                <MiniStat
                  label="Issues"
                  value={`${
                    (latest.issues?.weak_bullets?.length ?? 0) +
                    (latest.issues?.grammar_issues?.length ?? 0) +
                    (latest.issues?.formatting_problems?.length ?? 0) +
                    (latest.issues?.ats_problems?.length ?? 0)
                  }`}
                />
              </div>

              {/* Trajectory rail */}
              <ScoreTrajectory analyses={analyses} />
            </div>

            <div className="mt-4 h-[3px] rounded-full bg-foreground/[0.06]">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${latest.overall_score}%`,
                  background: "linear-gradient(90deg,#0E0B1F,#6D54B3)",
                }}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("enhanced")}
                className="px-4 py-2 rounded-full bg-foreground text-background text-[12.5px] font-medium tracking-tight hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate perfect resume
              </button>
              <button
                type="button"
                onClick={() => setTab("issues")}
                className="px-4 py-2 rounded-full text-foreground/65 text-[12.5px] hover:bg-foreground/5 transition-colors"
              >
                Fix top issues →
              </button>
              <button
                type="button"
                onClick={() => setTab("tailored")}
                className="px-4 py-2 rounded-full text-foreground/65 text-[12.5px] hover:bg-foreground/5 transition-colors"
              >
                Tailor to a role
              </button>
              <button
                type="button"
                onClick={() => setTab("extracted")}
                className="px-4 py-2 rounded-full text-foreground/65 text-[12.5px] hover:bg-foreground/5 transition-colors"
              >
                What we found
              </button>
            </div>
          </SectionCard>

          {/* ACT — top 3 quick wins surfaced front and center */}
          {quickWins && <QuickWins className="mt-4" wins={quickWins} />}

          {/* Suite shortcuts — quiet next-best-step strip */}
          <SuiteShortcuts />

          {/* DEEP DIVES — collapsed by default. User opens only what they want. */}
          <SectionCard className="mt-4 p-0 overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-foreground/[0.06]">
              <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                Deep dive
              </p>
              <p className="mt-1 text-[12.5px] text-foreground/55 tracking-tight">
                Tap any section to expand. Skim what matters, skip the rest.
              </p>
            </div>
            <Accordion type="multiple" className="px-2 sm:px-3">
              {!!latest.strengths?.length && (
                <DeepDiveItem
                  value="strengths"
                  title="Strengths"
                  count={latest.strengths.length}
                  tone="green"
                  preview={latest.strengths[0]?.title}
                >
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {latest.strengths.map((s, i) => (
                      <li
                        key={i}
                        className="rounded-xl bg-[hsl(150_55%_45%/0.06)] border border-[hsl(150_55%_45%/0.14)] p-3.5"
                      >
                        <p className="text-[13px] font-medium tracking-tight text-foreground">
                          {s.title}
                        </p>
                        <p className="mt-1 text-[12.5px] text-foreground/65 leading-snug tracking-tight">
                          {s.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </DeepDiveItem>
              )}

              {!!latest.weaknesses?.length && (
                <DeepDiveItem
                  value="weaknesses"
                  title="Refinement opportunities"
                  count={latest.weaknesses.length}
                  tone="amber"
                  preview={latest.weaknesses[0]?.title}
                >
                  <ul className="divide-y divide-foreground/[0.06]">
                    {latest.weaknesses.map((w, i) => (
                      <li key={i} className="py-3 flex items-start gap-3">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full tracking-tight shrink-0 mt-0.5 ${SEVERITY_TONE[w.severity]}`}
                        >
                          {WEAKNESS_LABEL[w.category]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium tracking-tight text-foreground">
                            {w.title}
                          </p>
                          <p className="mt-0.5 text-[12.5px] text-foreground/65 leading-snug tracking-tight">
                            {w.detail}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </DeepDiveItem>
              )}

              {!!latest.bullet_rewrites?.length && (
                <DeepDiveItem
                  value="rewrites"
                  title="Before → After rewrites"
                  count={latest.bullet_rewrites.length}
                  tone="violet"
                  preview="Concrete rewrites with realistic metrics"
                >
                  <ul className="space-y-3">
                    {latest.bullet_rewrites.map((b, i) => (
                      <li key={i} className="rounded-xl bg-foreground/[0.025] p-3.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] tracking-[0.18em] uppercase text-foreground/40 font-medium">
                              Before
                            </p>
                            <p className="mt-1.5 text-[13px] text-foreground/70 leading-snug tracking-tight line-through decoration-foreground/20">
                              {b.before}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] tracking-[0.18em] uppercase text-[hsl(258_38%_52%)] font-medium">
                              After
                            </p>
                            <p className="mt-1.5 text-[13px] text-foreground leading-snug tracking-tight font-medium">
                              {b.after}
                            </p>
                          </div>
                        </div>
                        {b.why && (
                          <p className="mt-2.5 text-[11.5px] text-foreground/55 tracking-tight">
                            Why: {b.why}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </DeepDiveItem>
              )}

              {latest.job_match?.match_percent != null && (
                <DeepDiveItem
                  value="job-match"
                  title="Job match"
                  count={`${Math.round(latest.job_match.match_percent)}%`}
                  tone="violet"
                  preview={
                    latest.job_match.target_role
                      ? `vs ${latest.job_match.target_role}`
                      : "Against your apparent target"
                  }
                >
                  <JobMatchCard match={latest.job_match} />
                </DeepDiveItem>
              )}

              {!isFree && latest.score_breakdown && (
                <DeepDiveItem
                  value="breakdown"
                  title="Score breakdown"
                  count={5}
                  tone="violet"
                  preview="ATS · Impact · Relevance · Clarity · Keywords"
                >
                  <ScoreBreakdownCard breakdown={latest.score_breakdown} />
                </DeepDiveItem>
              )}

              {insightsColumns && (
                <DeepDiveItem
                  value="insights"
                  title="Strengths · Gaps · Risks"
                  count={
                    (insightsColumns[0]?.items.length ?? 0) +
                    (insightsColumns[1]?.items.length ?? 0) +
                    (insightsColumns[2]?.items.length ?? 0)
                  }
                  tone="green"
                  preview="A side-by-side hiring-manager view"
                  isLast
                >
                  <InsightsTriad columns={insightsColumns} />
                </DeepDiveItem>
              )}
            </Accordion>
          </SectionCard>
        </>
      )}

      {/* COMPARE TAB — latest vs previous, side by side */}
      {tab === "compare" && latest && (
        isFree ? (
          <UpgradeLock
            className="mt-5"
            title="Compare versions side by side"
            description="See every score axis, skill, and issue that moved between resume versions, with improvements highlighted in green. Available on Pro."
          />
        ) : analyses.length < 2 ? (
          <SectionCard className="mt-5">
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              One version on file
            </p>
            <p className="mt-2 text-[14px] text-foreground/70 tracking-tight leading-snug max-w-xl">
              Re-upload an improved resume to unlock the side-by-side comparison — we'll show
              every score axis, skill, and issue that moved, with improvements highlighted in green.
            </p>
          </SectionCard>
        ) : (
          <TransformationPanel
            className="mt-5"
            versions={[analyses[0], analyses[1]]}
          />
        )
      )}

      {/* EXTRACTED TAB */}
      {tab === "extracted" && latest && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionCard>
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              Skills · {latest.extracted?.skills?.length ?? 0}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(latest.extracted?.skills ?? []).map((s, i) => (
                <span
                  key={i}
                  className="text-[12px] px-2.5 py-1 rounded-full bg-foreground/[0.05] text-foreground/75 tracking-tight"
                >
                  {s}
                </span>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              Keywords · {latest.extracted?.keywords?.length ?? 0}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(latest.extracted?.keywords ?? []).map((s, i) => (
                <span
                  key={i}
                  className="text-[12px] px-2.5 py-1 rounded-full bg-[hsl(258_45%_58%/0.10)] text-[hsl(258_38%_42%)] tracking-tight"
                >
                  {s}
                </span>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="md:col-span-2">
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              Experience
            </p>
            <ul className="mt-3 space-y-4">
              {(latest.extracted?.experience ?? []).map((exp, i) => (
                <li key={i} className="border-l-2 border-foreground/10 pl-4">
                  <p className="text-[14px] font-medium tracking-tight">
                    {exp.title}{" "}
                    <span className="text-foreground/55 font-normal">· {exp.company}</span>
                  </p>
                  {exp.dates && (
                    <p className="text-[11.5px] text-foreground/45 mt-0.5">{exp.dates}</p>
                  )}
                  <ul className="mt-2 space-y-1">
                    {(exp.bullets ?? []).map((b, j) => (
                      <li
                        key={j}
                        className="text-[12.5px] leading-[1.5] text-foreground/70 tracking-tight"
                      >
                        • {b}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
              {!latest.extracted?.experience?.length && (
                <p className="text-[13px] text-foreground/55">No experience extracted.</p>
              )}
            </ul>
          </SectionCard>

          {!!latest.extracted?.projects?.length && (
            <SectionCard>
              <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                Projects
              </p>
              <ul className="mt-3 space-y-2.5">
                {latest.extracted.projects.map((p, i) => (
                  <li key={i}>
                    <p className="text-[13px] font-medium tracking-tight">{p.name}</p>
                    {p.description && (
                      <p className="text-[12px] text-foreground/60 leading-snug">
                        {p.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {!!latest.extracted?.education?.length && (
            <SectionCard>
              <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                Education
              </p>
              <ul className="mt-3 space-y-2.5">
                {latest.extracted.education.map((e, i) => (
                  <li key={i}>
                    <p className="text-[13px] font-medium tracking-tight">{e.degree}</p>
                    <p className="text-[12px] text-foreground/60">
                      {e.school}
                      {e.dates ? ` · ${e.dates}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {!!latest.extracted?.achievements?.length && (
            <SectionCard className="md:col-span-2">
              <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                Achievements
              </p>
              <ul className="mt-3 space-y-1.5">
                {latest.extracted.achievements.map((a, i) => (
                  <li
                    key={i}
                    className="text-[13px] text-foreground/75 leading-snug tracking-tight"
                  >
                    • {a}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      )}

      {/* ISSUES TAB */}
      {tab === "issues" && latest && (
        isFree ? (
          <UpgradeLock
            className="mt-5"
            title="See every issue blocking your interviews"
            description="Missing sections, ATS problems, formatting traps, grammar slips, and weak bullets — all surfaced with concrete fixes. Available on Pro."
          />
        ) : (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <IssueList
            label="Missing sections"
            tone="amber"
            items={latest.issues?.missing_sections ?? []}
          />
          <IssueList
            label="ATS problems"
            tone="violet"
            items={latest.issues?.ats_problems ?? []}
          />
          <IssueList
            label="Formatting"
            tone="amber"
            items={latest.issues?.formatting_problems ?? []}
          />
          <IssueList
            label="Grammar"
            tone="violet"
            items={latest.issues?.grammar_issues ?? []}
          />

          <SectionCard className="md:col-span-2">
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              Bullets to sharpen · {latest.issues?.weak_bullets?.length ?? 0}
            </p>
            <ul className="mt-3 space-y-3">
              {(latest.issues?.weak_bullets ?? []).map((b, i) => (
                <li key={i} className="rounded-xl bg-foreground/[0.03] p-3.5">
                  <p className="text-[13px] text-foreground tracking-tight">“{b.text}”</p>
                  <p className="text-[12px] text-foreground/55 mt-1.5 leading-snug">
                    {b.reason}
                  </p>
                </li>
              ))}
              {!latest.issues?.weak_bullets?.length && (
                <p className="text-[13px] text-foreground/55">Every bullet is pulling its weight — beautifully done.</p>
              )}
            </ul>
          </SectionCard>
        </div>
        )
      )}

      {/* ENHANCED TAB */}
      {tab === "enhanced" && (
        isFree ? (
          <UpgradeLock
            className="mt-5"
            title="Generate your perfect, recruiter-ready resume"
            description="One-click rewrite that fixes every issue from the analysis — sharpened bullets, quantified impact, ATS-friendly layout. Available on Pro."
          />
        ) : (
          <EnhancedResumePanel
            className="mt-5"
            resumeId={latest?.resume_id ?? null}
            analysisId={latest?.id ?? null}
          />
        )
      )}

      {/* TAILORED TAB */}
      {tab === "tailored" && (
        isFree ? (
          <UpgradeLock
            className="mt-5"
            title="Tailor your resume to any role"
            description="Inject role-specific keywords, rewrite bullets for the target job description, and lift your match score. Available on Pro."
          />
        ) : (
          <TailoredEditsPanel
            className="mt-5"
            resumeId={latest?.resume_id ?? null}
            analysisId={latest?.id ?? null}
            defaultTargetRole={latest?.target_role ?? undefined}
          />
        )
      )}

      {/* HISTORY TAB */}
      {tab === "versions" && (
        isFree ? (
          <UpgradeLock
            className="mt-5"
            title="Track every version of your resume"
            description="See your full progression over time — each upload, each score change, each improvement. Available on Pro."
          />
        ) : (
          <TransformationPanel className="mt-5" versions={analyses} />
        )
      )}

      {/* Footer rail — anchors the page so it never ends in raw whitespace */}
      <DashboardFooterRail
        lastSync={latest?.created_at}
        analysesCount={analyses.length}
      />

      <UpgradePlanDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={ent.plan}
        feature={!ent.can("analyses") ? "analyses" : "resume_uploads"}
      />
    </div>
  );
};

// ----- MiniStat: compact inline stat pill -----
const MiniStat = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) => (
  <div
    className={cn(
      "rounded-xl px-3 py-2 border",
      accent
        ? "bg-[hsl(258_45%_58%/0.08)] border-[hsl(258_45%_58%/0.18)]"
        : "bg-foreground/[0.025] border-foreground/[0.06]",
    )}
  >
    <p className="text-[9.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
      {label}
    </p>
    <p
      className={cn(
        "mt-0.5 text-[18px] font-semibold tracking-[-0.02em] tabular-nums",
        accent ? "text-[hsl(258_38%_42%)]" : "text-foreground",
      )}
    >
      {value}
    </p>
  </div>
);

// ----- DeepDiveItem: collapsible accordion row used inside the "Deep dive" card -----
const DEEP_DIVE_TONE: Record<"green" | "amber" | "violet", string> = {
  green: "bg-[hsl(150_55%_45%/0.10)] text-[hsl(150_45%_28%)]",
  amber: "bg-[hsl(35_92%_55%/0.12)] text-[hsl(28_70%_38%)]",
  violet: "bg-[hsl(258_45%_58%/0.12)] text-[hsl(258_38%_42%)]",
};

const DeepDiveItem = ({
  value,
  title,
  count,
  tone,
  preview,
  isLast,
  children,
}: {
  value: string;
  title: string;
  count: number | string;
  tone: "green" | "amber" | "violet";
  preview?: string;
  isLast?: boolean;
  children: React.ReactNode;
}) => (
  <AccordionItem
    value={value}
    className={cn("border-b border-foreground/[0.06]", isLast && "border-b-0")}
  >
    <AccordionTrigger className="hover:no-underline py-3.5 px-2 sm:px-3 group">
      <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
        <span
          className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full tracking-tight shrink-0",
            DEEP_DIVE_TONE[tone],
          )}
        >
          {count}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium tracking-tight text-foreground">{title}</p>
          {preview && (
            <p className="mt-0.5 text-[11.5px] text-foreground/50 tracking-tight truncate">
              {preview}
            </p>
          )}
        </div>
      </div>
    </AccordionTrigger>
    <AccordionContent className="px-2 sm:px-3 pb-4">{children}</AccordionContent>
  </AccordionItem>
);

const toneClass: Record<"amber" | "violet" | "green", string> = {
  amber: "bg-[hsl(35_92%_55%/0.12)] text-[hsl(28_70%_38%)]",
  violet: "bg-[hsl(258_45%_58%/0.12)] text-[hsl(258_38%_42%)]",
  green: "bg-[hsl(150_55%_45%/0.10)] text-[hsl(150_45%_28%)]",
};

const IssueList = ({
  label,
  tone,
  items,
}: {
  label: string;
  tone: "amber" | "violet" | "green";
  items: string[];
}) => (
  <SectionCard>
    <div className="flex items-center justify-between">
      <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
        {label}
      </p>
      <span
        className={`text-[10px] font-medium px-2 py-0.5 rounded-full tracking-tight ${toneClass[tone]}`}
      >
        {items.length}
      </span>
    </div>
    <ul className="mt-3 space-y-2">
      {items.length ? (
        items.map((t, i) => (
          <li
            key={i}
            className="text-[12.5px] leading-[1.5] text-foreground/75 tracking-tight"
          >
            • {t}
          </li>
        ))
      ) : (
        <li className="text-[12.5px] text-foreground/45">None detected.</li>
      )}
    </ul>
  </SectionCard>
);

// ----- Job match card -----
const JobMatchCard = ({ match }: { match: NonNullable<Analysis["job_match"]> }) => {
  const pct = Math.max(0, Math.min(100, Math.round(match.match_percent ?? 0)));
  const target = Math.max(pct, Math.min(100, Math.round(match.target_percent ?? Math.min(100, pct + 22))));
  const missing = match.missing_requirements ?? [];
  return (
    <SectionCard>
      <div className="flex items-baseline justify-between">
        <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
          Job match
        </p>
        {match.target_role && (
          <span className="text-[11px] text-foreground/55 tracking-tight truncate max-w-[60%]">
            vs {match.target_role}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-[44px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
          {pct}
          <span className="text-[18px] text-foreground/30">%</span>
        </p>
        <span className="text-[12px] text-foreground/55 tracking-tight">
          → {target}% reachable
        </span>
      </div>
      <div className="mt-3 relative h-[6px] rounded-full bg-foreground/[0.06] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${target}%`, background: "hsl(258 45% 58% / 0.18)" }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#0E0B1F,#6D54B3)" }}
        />
      </div>
      {missing.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] text-foreground/55 tracking-tight">
            Improve these {Math.min(missing.length, 5)} areas to reach {target}%+
          </p>
          <ul className="mt-2 space-y-1.5">
            {missing.slice(0, 5).map((m, i) => (
              <li
                key={i}
                className="text-[12.5px] leading-[1.5] text-foreground/75 tracking-tight flex items-start gap-2"
              >
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[hsl(258_45%_58%)] shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
};

// ----- Score breakdown card -----
const BREAKDOWN_LABELS: { key: keyof NonNullable<Analysis["score_breakdown"]>; label: string }[] = [
  { key: "ats_compatibility", label: "ATS compatibility" },
  { key: "impact_statements", label: "Impact statements" },
  { key: "relevance", label: "Relevance" },
  { key: "clarity", label: "Clarity" },
  { key: "keyword_match", label: "Keyword match" },
];

const ScoreBreakdownCard = ({
  breakdown,
}: {
  breakdown: NonNullable<Analysis["score_breakdown"]>;
}) => {
  return (
    <SectionCard>
      <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
        Score breakdown
      </p>
      <ul className="mt-3 space-y-2.5">
        {BREAKDOWN_LABELS.map(({ key, label }) => {
          const val = Math.max(0, Math.min(100, Math.round(breakdown[key] ?? 0)));
          return (
            <li key={key}>
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-foreground/75 tracking-tight">{label}</span>
                <span className="text-[12px] font-medium text-foreground tabular-nums">{val}</span>
              </div>
              <div className="mt-1 h-[3px] rounded-full bg-foreground/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{
                    width: `${val}%`,
                    background:
                      val >= 80
                        ? "linear-gradient(90deg,#0E0B1F,#6D54B3)"
                        : val >= 60
                        ? "hsl(258 45% 58%)"
                        : "hsl(35 92% 55%)",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
};



// ----- Weaknesses card -----
const WEAKNESS_LABEL: Record<Weakness["category"], string> = {
  lack_of_metrics: "Quantify impact",
  weak_action_verbs: "Stronger verbs",
  too_generic: "Add specificity",
  missing_summary: "Add a summary",
  skills_mismatch: "Skills alignment",
  ats_formatting: "ATS polish",
  grammar: "Language polish",
  other: "Refinement",
};

const SEVERITY_TONE: Record<Weakness["severity"], string> = {
  high: "bg-[hsl(0_70%_55%/0.10)] text-[hsl(0_60%_38%)]",
  medium: "bg-[hsl(35_92%_55%/0.12)] text-[hsl(28_70%_38%)]",
  low: "bg-[hsl(258_45%_58%/0.10)] text-[hsl(258_38%_42%)]",
};

// ----- HeadlineCompanion: small "last analyzed" card paired with the headline -----
const formatRelative = (iso?: string) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const HeadlineCompanion = ({
  createdAt,
  score,
  count,
}: {
  createdAt: string;
  score: number;
  count: number;
}) => (
  <div className="hidden lg:block rounded-2xl bg-card/55 backdrop-blur-xl border border-white/70 px-4 py-3.5 shadow-[0_1px_0_hsl(0_0%_100%/0.85)_inset]">
    <div className="flex items-center justify-between">
      <p className="text-[10px] tracking-[0.22em] uppercase text-foreground/40 font-medium">
        Last analyzed
      </p>
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[hsl(258_45%_58%/0.10)] text-[hsl(258_38%_42%)] tabular-nums">
        {score}
      </span>
    </div>
    <p className="mt-1.5 text-[14px] font-medium tracking-tight text-foreground tabular-nums">
      {formatRelative(createdAt)}
    </p>
    <p className="mt-0.5 text-[11.5px] text-foreground/50 tracking-tight">
      {count} {count === 1 ? "version" : "versions"} on file
    </p>
  </div>
);

// ----- ScoreTrajectory: tiny right-rail trend in the hero card -----
const ScoreTrajectory = ({ analyses }: { analyses: Analysis[] }) => {
  // analyses are newest-first; reverse for left→right reading
  const series = analyses.slice(0, 6).map((a) => a.overall_score).reverse();
  const hasTrend = series.length >= 2;
  const delta = hasTrend ? series[series.length - 1] - series[0] : 0;

  if (!hasTrend) {
    return (
      <div className="hidden lg:flex flex-col justify-end h-full">
        <p className="text-[10px] tracking-[0.22em] uppercase text-foreground/40 font-medium">
          Trajectory
        </p>
        <p className="mt-2 text-[12.5px] text-foreground/55 tracking-tight">
          First analysis · upload again to track lift.
        </p>
      </div>
    );
  }

  const w = 100;
  const h = 32;
  const min = Math.min(...series) - 2;
  const max = Math.max(...series) + 2;
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = h - ((v - min) / Math.max(1, max - min)) * h;
    return [x, y] as const;
  });
  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];

  return (
    <div className="hidden lg:flex flex-col justify-end h-full">
      <p className="text-[10px] tracking-[0.22em] uppercase text-foreground/40 font-medium">
        Trajectory
      </p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className="text-[18px] font-semibold tracking-[-0.02em] text-foreground tabular-nums leading-none">
          {series[0]} <span className="text-foreground/30">→</span> {series[series.length - 1]}
        </p>
        <span
          className={cn(
            "text-[11px] font-medium tabular-nums",
            delta >= 0 ? "text-[hsl(150_45%_32%)]" : "text-[hsl(0_60%_45%)]",
          )}
        >
          {delta >= 0 ? "+" : ""}
          {delta} pts
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-2 w-full h-8" aria-hidden>
        <path d={linePath} fill="none" stroke="#6D54B3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={lx} cy={ly} r="2.4" fill="#fff" stroke="#6D54B3" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="mt-1 text-[10.5px] text-foreground/40 tracking-tight">
        Last {series.length} analyses
      </p>
    </div>
  );
};

// ----- SuiteShortcuts: low-key next-best-step strip across the suite -----
const SuiteShortcuts = () => {
  const items = [
    { to: "/app/interview-prep", icon: Mic, label: "Practice an interview", hint: "Voice-first mock with feedback" },
    { to: "/app/cover-letter", icon: Mail, label: "Draft a cover letter", hint: "Tailored to a specific role" },
    { to: "/app/applications", icon: Target, label: "Track applications", hint: "Stay on top of every loop" },
  ];
  return (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {items.map(({ to, icon: Icon, label, hint }) => (
        <Link
          key={to}
          to={to}
          className="group flex items-center gap-3 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/60 px-4 py-3 hover:bg-card/70 transition-colors"
        >
          <span className="w-8 h-8 rounded-xl bg-foreground/[0.04] flex items-center justify-center text-foreground/70 shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium tracking-tight text-foreground truncate">
              {label}
            </p>
            <p className="text-[11px] text-foreground/50 tracking-tight truncate">
              {hint}
            </p>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-foreground/30 group-hover:text-foreground/60 transition-colors shrink-0" />
        </Link>
      ))}
    </div>
  );
};

// ----- DashboardFooterRail: thin closing rail at the bottom of the page -----
const DashboardFooterRail = ({
  lastSync,
  analysesCount,
}: {
  lastSync?: string;
  analysesCount: number;
}) => (
  <div className="mt-10 pt-5 border-t border-foreground/[0.06] flex flex-wrap items-center justify-between gap-3 text-[11px] tracking-tight text-foreground/45">
    <div className="flex items-center gap-2">
      <RefreshCw className="w-3 h-3" />
      <span>Last sync · {lastSync ? formatRelative(lastSync) : "—"}</span>
    </div>
    <span className="tabular-nums">
      {analysesCount} {analysesCount === 1 ? "resume" : "resumes"} analyzed
    </span>
    <span className="text-foreground/35">Hirely v1.0</span>
  </div>
);


export default ResumeAnalyzer;

