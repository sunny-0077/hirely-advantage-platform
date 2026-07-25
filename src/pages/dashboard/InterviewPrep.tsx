import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Sparkles, Loader2, Copy, Check, Trash2, Shuffle, Wand2, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import MockInterviewPanel from "@/components/dashboard/MockInterviewPanel";
import { ResumeUploadCard } from "@/components/dashboard/ResumeUploadCard";
import { toast } from "sonner";
import { SegmentedTabs } from "@/components/dashboard/SegmentedTabs";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { TOOL_META } from "@/lib/toolMeta";

import { RoleSuggestInput } from "@/components/dashboard/RoleSuggestInput";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type QuestionType = "behavioral" | "technical" | "case" | "general";
type GenerableType = "behavioral" | "technical" | "case";

type GeneratedQuestion = {
  id: string;
  question: string;
  question_type: GenerableType;
  rationale: string | null;
  focus_area: string | null;
  difficulty: string | null;
};

type StarPart = { present: boolean; note: string };

type Analysis = {
  id: string;
  question: string;
  question_type: QuestionType;
  target_role: string | null;
  answer: string;
  clarity_score: number | null;
  confidence_score: number | null;
  length_score: number | null;
  metrics_score: number | null;
  star_score: number | null;
  keyword_score: number | null;
  overall_score: number | null;
  strengths: string[];
  gaps: string[];
  matched_keywords: string[];
  missing_keywords: string[];
  star_breakdown: {
    situation?: StarPart;
    task?: StarPart;
    action?: StarPart;
    result?: StarPart;
  };
  improved_answer: string | null;
  coaching_note: string | null;
  word_count: number | null;
  created_at: string;
};

const QUESTION_TYPES: { type: GenerableType; label: string }[] = [
  { type: "behavioral", label: "Behavioral" },
  { type: "technical", label: "Technical" },
  { type: "case", label: "Case / PM" },
];

const tabs = [
  { value: "practice", label: "Practice" },
  { value: "mock", label: "Mock interview" },
];

// One-line "what a strong answer must cover" hint per question type.
const focusLineFor = (type: GenerableType, focusArea?: string | null): string => {
  const base =
    type === "behavioral"
      ? "Situation + Action + measurable Result"
      : type === "technical"
        ? "Technical challenge + your approach + measurable outcome"
        : "Problem framing + structured approach + recommendation with numbers";
  return focusArea ? `${base} · ${focusArea}` : base;
};

const InterviewPrep = () => {
  const { user } = useAuth();
  const ent = useEntitlements();
  const [tab, setTab] = useState("practice");

  // form
  const [qType, setQType] = useState<GenerableType>("behavioral");
  const [question, setQuestion] = useState<string>("");
  const [questionMeta, setQuestionMeta] = useState<{ rationale: string | null; focus_area: string | null; difficulty: string | null } | null>(null);
  const [answer, setAnswer] = useState("");
  const [targetRole, setTargetRole] = useState("");

  // resume + question generation
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [generatingQ, setGeneratingQ] = useState(false);
  const [shuffleCount, setShuffleCount] = useState(0);

  // Auto-grow the question textarea so the full question is always visible.
  const questionRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = questionRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [question, generatingQ]);

  // results
  const [analyzing, setAnalyzing] = useState(false);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(
    () => history.find((h) => h.id === activeId) ?? null,
    [history, activeId],
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      setResumeLoading(true);
      const [{ data: rows }, { data: r }] = await Promise.all([
        supabase
          .from("interview_answers")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("resumes")
          .select("id, file_name")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      setHistory((rows ?? []) as unknown as Analysis[]);
      if (rows?.[0]) setActiveId(rows[0].id);
      if (r?.[0]) {
        setResumeId(r[0].id);
        setResumeName(r[0].file_name ?? null);
      }
      setResumeLoading(false);
    })();
  }, [user?.id]);

  const refresh = async () => {
    const { data } = await supabase
      .from("interview_answers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setHistory((data ?? []) as unknown as Analysis[]);
  };

  const wordCount = useMemo(
    () => answer.trim().split(/\s+/).filter(Boolean).length,
    [answer],
  );

  const generateQuestion = async (type: GenerableType = qType) => {
    if (!resumeId) {
      toast.error("Upload your resume first.");
      return;
    }
    if (!ent.can("interview_questions")) {
      toast.error(
        ent.plan === "free"
          ? "Free plan includes 3 interview questions. Upgrade to Pro for unlimited."
          : "You've reached your monthly interview-question limit.",
      );
      return;
    }
    setGeneratingQ(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-interview-questions",
        {
          body: {
            resume_id: resumeId,
            question_type: type,
            target_role: targetRole.trim() || undefined,
            count: 1,
          },
        },
      );
      if (error) throw new Error(error.message || "Couldn't generate question");
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const q = (data as { questions?: GeneratedQuestion[] }).questions?.[0];
      if (!q) throw new Error("No question returned");
      setQuestion(q.question);
      setQuestionMeta({
        rationale: q.rationale,
        focus_area: q.focus_area,
        difficulty: q.difficulty,
      });
      ent.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGeneratingQ(false);
    }
  };

  const shuffleQuestion = async () => {
    setShuffleCount((c) => c + 1);
    await generateQuestion(qType);
  };

  const switchType = async (t: GenerableType) => {
    if (t === qType) return;
    setQType(t);
    if (resumeId) {
      await generateQuestion(t);
    }
  };

  const analyze = async () => {
    if (!question.trim()) {
      toast.error("Generate a question first.");
      return;
    }
    if (answer.trim().length < 20) {
      toast.error("Write at least a couple of sentences before analyzing.");
      return;
    }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-interview-answer", {
        body: {
          question: question.trim(),
          answer: answer.trim(),
          question_type: qType,
          target_role: targetRole.trim() || undefined,
          resume_id: resumeId ?? undefined,
        },
      });
      if (error) throw new Error(error.message || "Analysis failed");
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const a = (data as { analysis?: Analysis }).analysis;
      if (a?.id) setActiveId(a.id);
      await refresh();
      toast.success("Analysis ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAnalyzing(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("interview_answers").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete");
      return;
    }
    if (activeId === id) setActiveId(null);
    refresh();
  };

  const copy = async (text: string, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Copy failed");
    }
  };

  // No auto-generation — the user must explicitly hit "Start practice".
  const [practiceStarted, setPracticeStarted] = useState(false);

  const startPractice = async () => {
    setPracticeStarted(true);
    if (!question && !generatingQ) {
      await generateQuestion(qType);
    }
  };

  return (
    <div className="w-full max-w-[1760px] mx-auto xl:-ml-4 2xl:-ml-8">
      <PageHeader
        eyebrow="Interview Prep"
        title="Practice under pressure. Walk in fluent."
        description="Type your answer. We score it on clarity, confidence, length, metrics, STAR structure, and keyword relevance — then rewrite a stronger version you can actually use."
        statusLabel="Scored on STAR, clarity & metrics"
        icon={TOOL_META["/app/interview-prep"].icon}
        iconColor={TOOL_META["/app/interview-prep"].color}
      />


      <div className="mt-6">
        <SegmentedTabs
          tabs={[...tabs, { value: "history", label: "History", count: history.length || undefined }]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "mock" && <div className="mt-5"><MockInterviewPanel resumeId={resumeId} /></div>}

      {tab === "practice" && !resumeLoading && !resumeId && user && (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <SectionCard tone="dark" className="lg:col-span-5 xl:col-span-4 p-5 flex flex-col justify-center">
              <p className="text-[10.5px] tracking-[0.22em] uppercase text-white/60 font-medium">
                Step 1 — Upload your resume
              </p>
              <p className="mt-2 text-[16px] leading-snug font-medium tracking-tight">
                Questions are written from your actual experience.
              </p>
              <p className="mt-1 text-[13px] text-white/70 tracking-tight">
                Once we read your resume, every Shuffle gives you a brand-new question grounded in
                your projects, skills and education — not generic FAQ filler. Hit shuffle 20 times,
                get 20 different questions. 100 times, 100 different questions.
              </p>
            </SectionCard>
            <ResumeUploadCard
              className="lg:col-span-7 xl:col-span-8"
              userId={user.id}
              onAnalyzed={async () => {
                const { data: r } = await supabase
                  .from("resumes")
                  .select("id, file_name")
                  .order("created_at", { ascending: false })
                  .limit(1);
                if (r?.[0]) {
                  setResumeId(r[0].id);
                  setResumeName(r[0].file_name ?? null);
                }
              }}
            />
        </div>
      )}

      {tab === "practice" && resumeId && !practiceStarted && (
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-4">
          <SectionCard className="xl:col-span-10 xl:col-start-2 p-0 overflow-visible">
            <div className="px-6 sm:px-8 pt-6 pb-5">
              <p className="text-[10.5px] tracking-[0.22em] uppercase text-foreground/45 font-medium">
                Ready when you are
              </p>
              <h2 className="mt-2 text-[22px] sm:text-[26px] leading-[1.1] font-semibold tracking-tight text-foreground">
                Practice grounded in your resume.
              </h2>
              <p className="mt-2 text-[13.5px] text-foreground/65 tracking-tight max-w-xl">
                Every question we generate is based on your actual experience — projects, skills,
                achievements. Pick a question type below, then start.
              </p>

              {resumeName && (
                <p className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] text-foreground/55 tracking-tight">
                  <FileText className="w-3.5 h-3.5" />
                  Using <span className="font-medium text-foreground/80">{resumeName}</span>
                </p>
              )}

              <div className="mt-5">
                <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                  Question type
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUESTION_TYPES.map((b) => (
                    <button
                      key={b.type}
                      type="button"
                      onClick={() => setQType(b.type)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[12px] font-medium tracking-tight transition-colors border",
                        qType === b.type
                          ? "bg-foreground text-background border-foreground"
                          : "bg-foreground/[0.03] border-foreground/[0.06] text-foreground/70 hover:bg-foreground/[0.06]",
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <label className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                  Target role (optional)
                </label>
                <RoleSuggestInput
                  value={targetRole}
                  onChange={setTargetRole}
                  placeholder="Senior PM, Data Analyst…"
                  className="mt-1.5"
                />
              </div>

              <div className="mt-6 flex items-center justify-end">
                <button
                  type="button"
                  onClick={startPractice}
                  disabled={generatingQ}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-medium tracking-tight bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {generatingQ ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Preparing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Start practice
                    </>
                  )}
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "practice" && resumeId && practiceStarted && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Composer */}
          <SectionCard className="md:col-span-7 lg:col-span-6 xl:col-span-5 p-0 overflow-visible">
            <div className="px-5 sm:px-6 pt-5 pb-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                  Question
                </p>
                {resumeName && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] text-foreground/50 tracking-tight max-w-[60%] truncate">
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="truncate">From {resumeName}</span>
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUESTION_TYPES.map((b) => (
                  <button
                    key={b.type}
                    type="button"
                    onClick={() => switchType(b.type)}
                    disabled={analyzing || generatingQ}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11.5px] font-medium tracking-tight transition-colors border",
                      qType === b.type
                        ? "bg-foreground text-background border-foreground"
                        : "bg-foreground/[0.03] border-foreground/[0.06] text-foreground/70 hover:bg-foreground/[0.06]",
                    )}
                  >
                    {b.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={shuffleQuestion}
                  disabled={analyzing || generatingQ}
                  className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-foreground/[0.04] hover:bg-foreground/[0.08] text-foreground/70 text-[11px] tracking-tight transition-colors disabled:opacity-50"
                >
                  {generatingQ ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Shuffle className="w-3 h-3" />
                  )}
                  Shuffle
                  {shuffleCount > 0 && (
                    <span className="text-foreground/45 tabular-nums">· {shuffleCount}</span>
                  )}
                </button>
              </div>

              <textarea
                ref={questionRef}
                value={generatingQ && !question ? "" : question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                disabled={analyzing || generatingQ}
                placeholder={generatingQ ? "Writing a question from your resume…" : "Hit Shuffle to get a personalized question."}
                className="mt-3 w-full bg-foreground/[0.03] border border-foreground/[0.06] rounded-lg px-3.5 py-2.5 text-[14px] leading-[1.55] text-foreground placeholder:text-foreground/35 outline-none focus:border-foreground/20 transition-colors resize-none overflow-hidden min-h-[68px]"
              />

              {/* Key focus line — tells the candidate what a strong answer needs to cover. */}
              {question && (
                <div className="mt-2 flex items-start gap-1.5 text-[11.5px] tracking-tight leading-snug">
                  <span className="px-1.5 py-0.5 rounded-md bg-foreground/[0.06] text-foreground/65 text-[10px] font-medium uppercase tracking-[0.14em] shrink-0 mt-0.5">
                    Focus
                  </span>
                  <span className="text-foreground/70">
                    {focusLineFor(qType, questionMeta?.focus_area)}
                  </span>
                </div>
              )}

              {questionMeta && (questionMeta.focus_area || questionMeta.difficulty || questionMeta.rationale) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {questionMeta.focus_area && (
                    <span className="px-2 py-0.5 rounded-full bg-foreground/[0.05] text-foreground/65 text-[10.5px] tracking-tight">
                      {questionMeta.focus_area}
                    </span>
                  )}
                  {questionMeta.difficulty && (
                    <span className="px-2 py-0.5 rounded-full bg-foreground/[0.05] text-foreground/65 text-[10.5px] tracking-tight capitalize">
                      {questionMeta.difficulty}
                    </span>
                  )}
                  {questionMeta.rationale && (
                    <span className="text-[11px] text-foreground/55 tracking-tight leading-snug w-full mt-1">
                      Why this: {questionMeta.rationale}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-foreground/[0.06] px-5 sm:px-6 py-4 space-y-3">
              <div>
                <label className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                  Target role (optional)
                </label>
                <RoleSuggestInput
                  value={targetRole}
                  onChange={setTargetRole}
                  disabled={analyzing}
                  placeholder="Senior PM, Data Analyst…"
                  className="mt-1.5"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                    Your answer
                  </label>
                  <span className="text-[11px] text-foreground/45 tabular-nums">
                    {wordCount} words
                    {wordCount > 0 && (
                      <>
                        {" · "}
                        <span
                          className={cn(
                            wordCount >= 150 && wordCount <= 300
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {wordCount < 150
                            ? "a bit short"
                            : wordCount <= 300
                              ? "good length"
                              : "trim this"}
                        </span>
                      </>
                    )}
                  </span>
                </div>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={6}
                  disabled={analyzing}
                  placeholder="Speak it like you would in the interview, then type it. Aim for 150–300 words for behavioral answers."
                  className="mt-1.5 w-full bg-foreground/[0.03] border border-foreground/[0.06] rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-foreground/35 outline-none focus:border-foreground/20 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="border-t border-foreground/[0.06] px-5 sm:px-6 py-3 flex items-center justify-between">
              <p className="text-[11px] text-foreground/50 tracking-tight inline-flex items-center gap-1">
                <Mic className="w-3 h-3" />
                Voice mode coming soon
              </p>
              <button
                type="button"
                onClick={analyze}
                disabled={analyzing}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-medium tracking-tight transition-opacity",
                  "bg-foreground text-background hover:opacity-90 disabled:opacity-50",
                )}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Scoring…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Analyze answer
                  </>
                )}
              </button>
            </div>
          </SectionCard>

          {/* Result — independently scrollable so page stays above the fold */}
          <div className="md:col-span-5 lg:col-span-6 xl:col-span-7 space-y-3 md:max-h-[calc(100vh-220px)] md:overflow-y-auto md:pr-1 [scrollbar-width:thin]">
            {active ? (
              <AnalysisView
                analysis={active}
                onCopy={copy}
                onUseImproved={(text) => {
                  const next = text ?? active.improved_answer;
                  if (next) {
                    setAnswer(next);
                    toast.success("Loaded improved answer — try delivering it now.");
                  }
                }}
                onPracticeAgain={() => {
                  setAnswer("");
                  shuffleQuestion();
                }}
              />
            ) : (
              <SectionCard className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-foreground/[0.05] grid place-items-center shrink-0">
                  <Wand2 className="w-4 h-4 text-foreground/55" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium tracking-tight text-foreground">
                    No analysis yet
                  </p>
                  <p className="text-[12.5px] text-foreground/60 tracking-tight">
                    Pick a question, write your answer, and we'll score it across six axes and
                    rewrite a sharper version.
                  </p>
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <SectionCard className="mt-5 p-0 overflow-hidden">
          <ul className="divide-y divide-foreground/[0.06]">
            {history.map((h) => (
              <li key={h.id} className="px-5 py-4 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium tracking-tight text-foreground truncate">
                    {h.question}
                  </p>
                  <p className="text-[11.5px] text-foreground/50 tracking-tight">
                    {h.question_type} ·{" "}
                    {h.overall_score !== null ? `${h.overall_score}/100` : "—"} ·{" "}
                    {new Date(h.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(h.id);
                    setTab("practice");
                  }}
                  className="text-[12px] px-3 py-1.5 rounded-full bg-foreground/[0.04] hover:bg-foreground/[0.08] text-foreground/75 tracking-tight transition-colors"
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => remove(h.id)}
                  className="text-foreground/40 hover:text-foreground/80 transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
            {!history.length && (
              <li className="px-5 py-6 text-[13px] text-foreground/55">
                No practice answers yet. Run your first one in the Practice tab.
              </li>
            )}
          </ul>
        </SectionCard>
      )}
    </div>
  );
};

const AnalysisView = ({
  analysis,
  onCopy,
  onUseImproved,
  onPracticeAgain,
}: {
  analysis: Analysis;
  onCopy: (text: string, label?: string) => void;
  onUseImproved: (text?: string) => void;
  onPracticeAgain: () => void;
}) => {
  const score = analysis.overall_score ?? 0;
  const scoreColor =
    score >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400";

  const star = analysis.star_breakdown ?? {};
  const starParts: { key: keyof typeof star; label: string }[] = [
    { key: "situation", label: "Situation" },
    { key: "task", label: "Task" },
    { key: "action", label: "Action" },
    { key: "result", label: "Result" },
  ];

  const axes: { label: string; value: number | null }[] = [
    { label: "Clarity", value: analysis.clarity_score },
    { label: "Confidence", value: analysis.confidence_score },
    { label: "STAR structure", value: analysis.star_score },
    { label: "Metrics", value: analysis.metrics_score },
    { label: "Keywords", value: analysis.keyword_score },
    { label: "Length", value: analysis.length_score },
  ];

  // Local override of the improved answer so "Make shorter / more confident" can update in place.
  const [improved, setImproved] = useState<string | null>(analysis.improved_answer ?? null);
  const [styleLoading, setStyleLoading] = useState<null | "shorter" | "confident">(null);

  // Reset when analysis changes.
  useEffect(() => {
    setImproved(analysis.improved_answer ?? null);
    setStyleLoading(null);
  }, [analysis.id, analysis.improved_answer]);

  const restyle = async (style: "shorter" | "confident") => {
    if (!improved) return;
    setStyleLoading(style);
    try {
      const { data, error } = await supabase.functions.invoke("rewrite-improved-answer", {
        body: { question: analysis.question, answer: improved, style },
      });
      if (error) throw new Error(error.message || "Rewrite failed");
      const e = (data as { error?: string })?.error;
      if (e) throw new Error(e);
      const next = (data as { answer?: string }).answer;
      if (!next) throw new Error("No rewrite returned");
      setImproved(next);
      toast.success(style === "shorter" ? "Tightened up." : "More confident tone.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't rewrite");
    } finally {
      setStyleLoading(null);
    }
  };

  return (
    <>
      {/* Compact score card — score + axes side-by-side to save vertical space */}
      <SectionCard className="p-4 sm:p-5">
        <div className="flex items-stretch gap-5">
          <div className="min-w-0 shrink-0 sm:w-[160px] flex flex-col justify-center pr-5 border-r border-foreground/[0.06]">
            <p className="text-[10px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              Overall
            </p>
            <p className={cn("mt-0.5 text-[36px] font-semibold tracking-[-0.03em] leading-none tabular-nums", scoreColor)}>
              {score}
              <span className="text-[15px] text-foreground/40 font-medium ml-1">/100</span>
            </p>
            {analysis.coaching_note && (
              <p className="mt-2 text-[11.5px] text-foreground/65 tracking-tight leading-snug">
                {analysis.coaching_note}
              </p>
            )}
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 self-center">
            {axes.map((a) => (
              <ScoreBar key={a.label} label={a.label} value={a.value} />
            ))}
          </div>
        </div>
      </SectionCard>

      {!improved && (
        <SectionCard className="p-5 ring-1 ring-foreground/10 bg-foreground/[0.02]">
          <p className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase font-semibold text-foreground/55">
            <Sparkles className="w-3 h-3" /> AI Improved Answer · Pro
          </p>
          <p className="mt-2 text-[13px] text-foreground/70 tracking-tight leading-snug max-w-xl">
            Free shows your score and gaps. Upgrade to Pro to see the full STAR-aligned rewrite and one-click "make shorter / more confident" remixes.
          </p>
          <a
            href="/app/upgrade"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-3.5 py-1.5 text-[12px] font-medium tracking-tight hover:opacity-90"
          >
            <Sparkles className="w-3 h-3" /> Unlock improved answers
          </a>
        </SectionCard>
      )}

      {improved && (
        <SectionCard className="p-0 overflow-hidden ring-1 ring-primary/15 shadow-[0_24px_60px_-30px_hsl(var(--primary)/0.35)]">
          {/* Premium gradient header */}
          <div
            className="px-5 sm:px-6 py-4 text-white"
            style={{ background: "linear-gradient(120deg,#0E0B1F 0%,#3a2d5e 55%,#6D54B3 100%)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase font-semibold text-white/85">
                  <Sparkles className="w-3 h-3" />
                  AI Improved Answer
                </p>
                <p className="mt-1 text-[13px] text-white/80 tracking-tight leading-snug">
                  Same story — sharper structure, stronger impact, STAR-aligned.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onCopy(improved, "Improved answer copied")}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium tracking-tight transition-colors backdrop-blur"
                aria-label="Copy improved answer"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
          </div>

          {/* The answer itself — primary content, larger leading for readability */}
          <div className="px-5 sm:px-6 py-4 bg-foreground/[0.015]">
            <p className="whitespace-pre-wrap text-[13.5px] leading-[1.65] text-foreground tracking-tight">
              {improved}
            </p>
            <p className="mt-2 text-[10.5px] text-foreground/45 tracking-tight">
              Anything in [brackets] is a placeholder — swap in your real number.
            </p>
          </div>

          {/* Action row — primary CTA on left, restyle chips middle, practice-again on right */}
          <div className="border-t border-foreground/[0.06] px-5 sm:px-6 py-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onUseImproved(improved)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-foreground text-background text-[12px] font-semibold tracking-tight hover:opacity-90 transition-opacity"
            >
              <Wand2 className="w-3 h-3" />
              Use improved
            </button>

            <span className="text-[10.5px] tracking-[0.16em] uppercase text-foreground/35 font-medium ml-1 hidden sm:inline">
              Tweak
            </span>

            <button
              type="button"
              onClick={() => restyle("shorter")}
              disabled={!!styleLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-foreground/[0.08] hover:bg-foreground/[0.05] text-foreground/75 text-[11.5px] font-medium tracking-tight transition-colors disabled:opacity-50"
            >
              {styleLoading === "shorter" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : null}
              Shorter
            </button>
            <button
              type="button"
              onClick={() => restyle("confident")}
              disabled={!!styleLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-foreground/[0.08] hover:bg-foreground/[0.05] text-foreground/75 text-[11.5px] font-medium tracking-tight transition-colors disabled:opacity-50"
            >
              {styleLoading === "confident" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : null}
              More confident
            </button>

            <button
              type="button"
              onClick={onPracticeAgain}
              className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground/[0.04] hover:bg-foreground/[0.08] text-foreground/75 text-[11.5px] font-medium tracking-tight transition-colors"
            >
              <Shuffle className="w-3 h-3" />
              Practice again
            </button>
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SectionCard className="p-4 sm:p-5">
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-emerald-700 dark:text-emerald-400 font-medium">
            What you did well
          </p>
          <ul className="mt-3 space-y-2">
            {(analysis.strengths ?? []).map((s, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-foreground/80 tracking-tight leading-snug">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
            {!analysis.strengths?.length && (
              <li className="text-[12.5px] text-foreground/55">No strengths surfaced.</li>
            )}
          </ul>
        </SectionCard>

        <SectionCard className="p-4 sm:p-5">
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-amber-700 dark:text-amber-400 font-medium">
            What you missed
          </p>
          <ul className="mt-3 space-y-2">
            {(analysis.gaps ?? []).map((g, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-foreground/80 tracking-tight leading-snug">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{g}</span>
              </li>
            ))}
            {!analysis.gaps?.length && (
              <li className="text-[12.5px] text-foreground/55">Nothing major to fix.</li>
            )}
          </ul>
        </SectionCard>
      </div>

      <SectionCard className="p-0 overflow-hidden">
        <div className="px-5 sm:px-6 pt-5 pb-3">
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            STAR breakdown
          </p>
          <p className="text-[12px] text-foreground/55 tracking-tight mt-1">
            Each section the interviewer expects, and whether it landed.
          </p>
        </div>
        <ul className="border-t border-foreground/[0.06] divide-y divide-foreground/[0.06]">
          {starParts.map((p) => {
            const part = (star as Record<string, StarPart | undefined>)[p.key as string];
            return (
              <li key={p.key as string} className="px-5 sm:px-6 py-3 flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 w-5 h-5 rounded-full grid place-items-center shrink-0 text-[10px] font-semibold",
                    part?.present
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-400",
                  )}
                >
                  {part?.present ? "✓" : "—"}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium tracking-tight text-foreground">{p.label}</p>
                  <p className="text-[12.5px] text-foreground/65 tracking-tight leading-snug">
                    {part?.note ?? "No notes."}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      {(analysis.matched_keywords?.length || analysis.missing_keywords?.length) ? (
        <SectionCard>
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            Keyword relevance
          </p>
          {!!analysis.matched_keywords?.length && (
            <div className="mt-3">
              <p className="text-[11px] text-foreground/55 tracking-tight mb-1.5">Used</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.matched_keywords.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11.5px] tracking-tight"
                  >
                    <Check className="w-2.5 h-2.5" />
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!!analysis.missing_keywords?.length && (
            <div className="mt-3">
              <p className="text-[11px] text-foreground/55 tracking-tight mb-1.5">Worth adding</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missing_keywords.map((k) => (
                  <span
                    key={k}
                    className="px-2 py-0.5 rounded-full bg-foreground/[0.05] text-foreground/65 text-[11.5px] tracking-tight"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      ) : null}
    </>
  );
};

const ScoreBar = ({ label, value }: { label: string; value: number | null }) => {
  const v = value ?? 0;
  const color =
    v >= 80
      ? "bg-emerald-500"
      : v >= 60
        ? "bg-amber-500"
        : "bg-rose-500";
  return (
    <div className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-2">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] text-foreground/55 tracking-tight">{label}</p>
        <p className="text-[12px] font-semibold text-foreground tabular-nums">
          {value ?? "—"}
        </p>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-foreground/[0.06] overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
};

export default InterviewPrep;
