import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  Loader2,
  Send,
  StopCircle,
  Sparkles,
  Clock,
  Flame,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useEntitlements } from "@/hooks/useEntitlements";
import { UpgradePlanDialog } from "@/components/dashboard/UpgradePlanDialog";
import { RoleSuggestInput } from "@/components/dashboard/RoleSuggestInput";
import { VoiceWaveform } from "@/components/dashboard/interview/VoiceWaveform";
import { MockScorecard } from "@/components/dashboard/interview/MockScorecard";

type Difficulty = "easy" | "medium" | "hard" | "stress";
type Focus = "behavioral" | "technical" | "case" | "mixed";

type Session = {
  id: string;
  target_role: string;
  focus: Focus;
  difficulty: Difficulty;
  duration_minutes: number;
  status: "active" | "finished" | "abandoned";
  started_at: string;
  ended_at: string | null;
  overall_score: number | null;
  summary: string | null;
  strengths: string[];
  improvements: string[];
};

type Turn = {
  id: string;
  session_id: string;
  turn_index: number;
  question: string;
  question_kind: "opening" | "follow_up" | "new_topic" | "curveball" | "wrap_up";
  answer: string | null;
  feedback: string | null;
  score: number | null;
  follow_up_hint: string | null;
};

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: "easy", label: "Easy", hint: "Friendly tone, gentle probing" },
  { value: "medium", label: "Medium", hint: "Steady, professional" },
  { value: "hard", label: "Hard", hint: "Senior-level pushback" },
  { value: "stress", label: "Stress", hint: "Skeptical, fast, intense" },
];

const FOCUSES: { value: Focus; label: string }[] = [
  { value: "behavioral", label: "Behavioral" },
  { value: "technical", label: "Technical" },
  { value: "case", label: "Case / PM" },
  { value: "mixed", label: "Mixed loop" },
];

const DURATIONS = [5, 10, 15, 20, 30] as const;

export const MockInterviewPanel = ({ resumeId }: { resumeId: string | null }) => {
  const ent = useEntitlements();
  const mockLimit = ent.limit("mock_interviews");
  const [showUpgrade, setShowUpgrade] = useState(false);
  // Setup state
  const [targetRole, setTargetRole] = useState("");
  const [focus, setFocus] = useState<Focus>("behavioral");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(15);

  // Live session state
  const [session, setSession] = useState<Session | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);

  // Timer
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (session?.status !== "active") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session?.status]);

  const elapsedSec = useMemo(() => {
    if (!session) return 0;
    return Math.floor((now - new Date(session.started_at).getTime()) / 1000);
  }, [now, session]);
  const totalSec = (session?.duration_minutes ?? 0) * 60;
  const remainingSec = Math.max(0, totalSec - elapsedSec);
  const timeUp = session?.status === "active" && remainingSec === 0;

  const transcriptRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, sending]);

  // Auto-end when time runs out
  useEffect(() => {
    if (timeUp && session && !ending) {
      void endSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  const start = async () => {
    if (!resumeId) {
      toast.error("Upload your resume first — questions are based on your resume.");
      return;
    }
    if (targetRole.trim().length < 2) {
      toast.error("Add the role you're practicing for.");
      return;
    }
    if (!ent.can("mock_interviews")) {
      setShowUpgrade(true);
      return;
    }
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("mock-interview", {
        body: {
          action: "start",
          target_role: targetRole.trim(),
          focus,
          difficulty,
          duration_minutes: duration,
          resume_id: resumeId ?? undefined,
        },
      });
      const quotaCode =
        (data as { code?: string } | null)?.code ||
        (error as { context?: { code?: string } } | null)?.context?.code;
      if (quotaCode === "OVER_QUOTA") {
        setShowUpgrade(true);
        ent.refresh();
        return;
      }
      if (error) throw new Error(error.message || "Failed to start");
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const s = (data as { session: Session }).session;
      const t = (data as { turn: Turn }).turn;
      setSession(s);
      setTurns([t]);
      setAnswer("");
      ent.refresh();
      toast.success("Interview started. Take a breath.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setStarting(false);
    }
  };

  const respond = async () => {
    if (!session) return;
    if (answer.trim().length < 2) {
      toast.error("Type your answer first.");
      return;
    }
    setSending(true);
    const myAnswer = answer.trim();
    // Optimistic: stamp the answer onto the last turn
    setTurns((prev) =>
      prev.map((t, i) => (i === prev.length - 1 ? { ...t, answer: myAnswer } : t)),
    );
    setAnswer("");
    try {
      const { data, error } = await supabase.functions.invoke("mock-interview", {
        body: { action: "respond", session_id: session.id, answer: myAnswer },
      });
      if (error) throw new Error(error.message || "Failed to send");
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const d = data as {
        previous_feedback?: string;
        previous_score?: number | null;
        turn: Turn;
        wrap_up?: boolean;
      };
      setTurns((prev) => {
        const updated = prev.map((t, i) =>
          i === prev.length - 1
            ? { ...t, feedback: d.previous_feedback ?? null, score: d.previous_score ?? null }
            : t,
        );
        return [...updated, d.turn];
      });
    } catch (e) {
      // Roll back the optimistic answer so the user can retry
      setTurns((prev) =>
        prev.map((t, i) => (i === prev.length - 1 ? { ...t, answer: null } : t)),
      );
      setAnswer(myAnswer);
      toast.error(e instanceof Error ? e.message : "Couldn't send answer");
    } finally {
      setSending(false);
    }
  };

  const endSession = async () => {
    if (!session) return;
    setEnding(true);
    try {
      const finalAnswer = answer.trim() || undefined;
      const { data, error } = await supabase.functions.invoke("mock-interview", {
        body: { action: "end", session_id: session.id, final_answer: finalAnswer },
      });
      if (error) throw new Error(error.message || "Failed to end");
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const s = (data as { session: Session }).session;
      setSession(s);
      if (finalAnswer) {
        setTurns((prev) =>
          prev.map((t, i) => (i === prev.length - 1 && !t.answer ? { ...t, answer: finalAnswer } : t)),
        );
        setAnswer("");
      }
      toast.success("Interview wrapped. Here's your debrief.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't end session");
    } finally {
      setEnding(false);
    }
  };

  const reset = () => {
    setSession(null);
    setTurns([]);
    setAnswer("");
  };

  // ---------------- SETUP SCREEN ----------------
  if (!session) {
    return (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <SectionCard className="lg:col-span-8 xl:col-span-7 p-0 overflow-visible">
          <div className="px-5 sm:px-6 pt-4 pb-3">
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              Set up your mock
            </p>
            <p className="mt-1 text-[12.5px] text-foreground/55 tracking-tight">
              Pick a role, a difficulty, and a length. We'll run a real, adaptive interview grounded in your resume.
            </p>
          </div>

          {!resumeId && (
            <div className="mx-5 sm:mx-6 mb-4 flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.08] px-3 py-2.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-[2px] text-amber-600 dark:text-amber-300 shrink-0" />
              <div className="text-[12px] tracking-tight text-amber-800 dark:text-amber-200">
                <p className="font-medium">Upload your resume first.</p>
                <p className="text-amber-800/80 dark:text-amber-200/80">
                  Questions are based strictly on your actual experience — projects, skills, metrics. Head to the Resume Analyzer (or the Practice tab) to upload, then come back.
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-foreground/[0.06] px-5 sm:px-6 py-3 space-y-3">
            <div>
              <label className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                Target role
              </label>
              <RoleSuggestInput
                value={targetRole}
                onChange={setTargetRole}
                disabled={starting}
                placeholder="Senior Product Manager"
                showQuickChips
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                Focus
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {FOCUSES.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFocus(f.value)}
                    disabled={starting}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11.5px] font-medium tracking-tight transition-colors border",
                      focus === f.value
                        ? "bg-foreground text-background border-foreground"
                        : "bg-foreground/[0.03] border-foreground/[0.06] text-foreground/70 hover:bg-foreground/[0.06]",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                Difficulty
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDifficulty(d.value)}
                    disabled={starting}
                    className={cn(
                      "rounded-lg px-2.5 py-2 text-left transition-colors border",
                      difficulty === d.value
                        ? "bg-foreground text-background border-foreground"
                        : "bg-foreground/[0.03] border-foreground/[0.06] hover:bg-foreground/[0.06]",
                    )}
                  >
                    <p className="text-[12.5px] font-medium tracking-tight inline-flex items-center gap-1">
                      {d.value === "stress" && <Flame className="w-3 h-3" />}
                      {d.label}
                    </p>
                    <p
                      className={cn(
                        "text-[11px] tracking-tight",
                        difficulty === d.value ? "text-background/60" : "text-foreground/50",
                      )}
                    >
                      {d.hint}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                Length
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {DURATIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDuration(m)}
                    disabled={starting}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11.5px] font-medium tracking-tight transition-colors border tabular-nums",
                      duration === m
                        ? "bg-foreground text-background border-foreground"
                        : "bg-foreground/[0.03] border-foreground/[0.06] text-foreground/70 hover:bg-foreground/[0.06]",
                    )}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-foreground/[0.06] px-5 sm:px-6 py-3 flex items-center justify-between gap-3">
            {ent.plan === "pro" && typeof mockLimit === "number" ? (
              <span className="text-[11.5px] tracking-tight text-foreground/60">
                Mock interviews this month{" "}
                <span className="font-medium text-foreground/85">
                  {ent.usage.mock_interviews} / {mockLimit}
                </span>
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={start}
              disabled={starting || !resumeId}
              title={!resumeId ? "Upload your resume to start a mock interview" : undefined}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-medium tracking-tight bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {starting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  {resumeId ? "Start mock interview" : "Upload resume to start"}
                </>
              )}
            </button>
          </div>
        </SectionCard>

        <SectionCard tone="dark" className="lg:col-span-4 xl:col-span-5 flex flex-col">
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-white/55 font-medium">
            How it works
          </p>
          <ul className="mt-3 space-y-2.5 text-[13px] text-white/80 leading-snug">
            <li className="flex gap-2">
              <span className="text-white/40 tabular-nums">01</span>
              The AI asks one question at a time, in character as your interviewer.
            </li>
            <li className="flex gap-2">
              <span className="text-white/40 tabular-nums">02</span>
              After each answer, you get short coaching and a score — then a follow-up that drills
              into what you said.
            </li>
            <li className="flex gap-2">
              <span className="text-white/40 tabular-nums">03</span>
              Timer runs in real time. When it hits zero, you get a full debrief.
            </li>
          </ul>
          <p className="mt-auto pt-4 text-[11.5px] text-white/50">
            Tip: Stress mode mimics a Director-level loop. Use it before a real onsite.
          </p>
        </SectionCard>
      </div>
      <UpgradePlanDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={ent.plan}
        feature="mock_interviews"
      />
      </>
    );
  }

  // ---------------- LIVE / FINISHED SCREEN ----------------
  const lastTurn = turns[turns.length - 1];
  const finished = session.status === "finished";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-8 space-y-4">
        <SectionCard className="p-0 overflow-hidden">
          <div className="px-5 sm:px-6 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-foreground/[0.06]">
            <div className="min-w-0">
              <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                {session.target_role} · {FOCUSES.find((f) => f.value === session.focus)?.label}
              </p>
              <p className="text-[11.5px] text-foreground/55 tracking-tight inline-flex items-center gap-1">
                {session.difficulty === "stress" && <Flame className="w-3 h-3" />}
                {DIFFICULTIES.find((d) => d.value === session.difficulty)?.label} difficulty
              </p>
            </div>
            <div className="flex items-center gap-2">
              <VoiceWaveform active={sending} />
              <TimerPill remainingSec={remainingSec} totalSec={totalSec} active={session.status === "active"} />
              {session.status === "active" && (
                <button
                  type="button"
                  onClick={endSession}
                  disabled={ending}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground/[0.06] hover:bg-foreground/[0.1] text-foreground/75 text-[11.5px] tracking-tight transition-colors"
                >
                  {ending ? <Loader2 className="w-3 h-3 animate-spin" /> : <StopCircle className="w-3 h-3" />}
                  End
                </button>
              )}
              {finished && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-[11.5px] font-medium tracking-tight hover:opacity-90 transition-opacity"
                >
                  New mock
                </button>
              )}
            </div>
          </div>

          <div ref={transcriptRef} className="px-5 sm:px-6 py-4 space-y-4 max-h-[520px] overflow-y-auto">
            {turns.map((t) => (
              <div key={t.id} className="space-y-3">
                <InterviewerBubble turn={t} />
                {t.answer && <CandidateBubble text={t.answer} />}
                {t.feedback && (
                  <CoachingBubble feedback={t.feedback} score={t.score} />
                )}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-[12px] text-foreground/55">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Interviewer is thinking…
              </div>
            )}
          </div>

          {session.status === "active" && (
            <div className="border-t border-foreground/[0.06] px-5 sm:px-6 py-3">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={3}
                disabled={sending || ending}
                placeholder={lastTurn?.answer ? "Waiting for the next question…" : "Type your answer. Aim for 90–180 seconds spoken."}
                className="w-full bg-foreground/[0.03] border border-foreground/[0.06] rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-foreground/35 outline-none focus:border-foreground/20 transition-colors resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) respond();
                }}
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[11px] text-foreground/45 tracking-tight">
                  ⌘/Ctrl + Enter to send
                </p>
                <button
                  type="button"
                  onClick={respond}
                  disabled={sending || ending || answer.trim().length < 2 || !!lastTurn?.answer}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-medium tracking-tight bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send answer
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </SectionCard>

        {finished && (
          <>
            <MockScorecard overall={session.overall_score ?? 0} turns={turns} />
            <DebriefCard session={session} />
          </>
        )}
      </div>

      <div className="lg:col-span-4 space-y-4">
        <SectionCard>
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            Live signals
          </p>
          <div className="mt-3 space-y-2">
            <SignalRow
              label="Turns"
              value={`${turns.filter((t) => t.answer).length} answered · ${turns.length} total`}
            />
            <SignalRow
              label="Avg score"
              value={(() => {
                const scores = turns.map((t) => t.score).filter((s): s is number => s !== null);
                if (!scores.length) return "—";
                return `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}/100`;
              })()}
            />
            <SignalRow
              label="Difficulty"
              value={DIFFICULTIES.find((d) => d.value === session.difficulty)?.label ?? ""}
            />
          </div>
        </SectionCard>

        {lastTurn?.follow_up_hint && session.status === "active" && (
          <SectionCard>
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              What they'll probe
            </p>
            <p className="mt-2 text-[13px] text-foreground/75 tracking-tight leading-snug">
              {lastTurn.follow_up_hint}
            </p>
          </SectionCard>
        )}
      </div>
    </div>
  );
};

// ---------- subcomponents ----------

const TimerPill = ({
  remainingSec,
  totalSec,
  active,
}: {
  remainingSec: number;
  totalSec: number;
  active: boolean;
}) => {
  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;
  const pct = totalSec ? remainingSec / totalSec : 0;
  const danger = active && pct < 0.2;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11.5px] font-medium tabular-nums tracking-tight",
        danger
          ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
          : "bg-foreground/[0.06] text-foreground/75",
      )}
    >
      <Clock className="w-3 h-3" />
      {m}:{s.toString().padStart(2, "0")}
    </div>
  );
};

const InterviewerBubble = ({ turn }: { turn: Turn }) => {
  const kindLabel: Record<Turn["question_kind"], string> = {
    opening: "Opening",
    follow_up: "Follow-up",
    new_topic: "New topic",
    curveball: "Curveball",
    wrap_up: "Wrap-up",
  };
  return (
    <div className="flex gap-3">
      <span className="w-7 h-7 rounded-full bg-foreground text-background grid place-items-center shrink-0 text-[11px] font-semibold">
        AI
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
          Interviewer · {kindLabel[turn.question_kind]}
        </p>
        <p className="mt-1 text-[14px] text-foreground tracking-tight leading-snug">
          {turn.question}
        </p>
      </div>
    </div>
  );
};

const CandidateBubble = ({ text }: { text: string }) => (
  <div className="flex gap-3 justify-end">
    <div className="min-w-0 max-w-[85%] bg-foreground/[0.05] rounded-lg px-3 py-2">
      <p className="text-[10px] tracking-[0.18em] uppercase text-foreground/45 font-medium">You</p>
      <p className="mt-1 text-[13.5px] text-foreground tracking-tight leading-snug whitespace-pre-wrap">
        {text}
      </p>
    </div>
  </div>
);

const CoachingBubble = ({ feedback, score }: { feedback: string; score: number | null }) => {
  const color =
    score === null
      ? "text-foreground/70"
      : score >= 80
        ? "text-emerald-700 dark:text-emerald-400"
        : score >= 60
          ? "text-amber-700 dark:text-amber-400"
          : "text-rose-700 dark:text-rose-400";
  return (
    <div className="ml-10 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.18em] uppercase text-foreground/45 font-medium inline-flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" />
          Coaching
        </p>
        {score !== null && (
          <p className={cn("text-[11px] font-semibold tabular-nums", color)}>{score}/100</p>
        )}
      </div>
      <p className="mt-1 text-[12.5px] text-foreground/75 tracking-tight leading-snug">
        {feedback}
      </p>
    </div>
  );
};

const SignalRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3">
    <p className="text-[11.5px] text-foreground/55 tracking-tight">{label}</p>
    <p className="text-[12.5px] font-medium text-foreground tabular-nums">{value}</p>
  </div>
);

const DebriefCard = ({ session }: { session: Session }) => {
  const score = session.overall_score ?? 0;
  const color =
    score >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400";
  return (
    <SectionCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            Debrief
          </p>
          <p className={cn("mt-1 text-[40px] font-semibold tracking-[-0.03em] leading-none tabular-nums", color)}>
            {score}
            <span className="text-[18px] text-foreground/40 font-medium ml-1">/100</span>
          </p>
          {session.summary && (
            <p className="mt-2 text-[13px] text-foreground/70 tracking-tight leading-snug max-w-md">
              {session.summary}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-emerald-700 dark:text-emerald-400 font-medium">
            Strengths
          </p>
          <ul className="mt-2 space-y-2">
            {(session.strengths ?? []).map((s, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-foreground/80 tracking-tight leading-snug">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-amber-700 dark:text-amber-400 font-medium">
            Improvements
          </p>
          <ul className="mt-2 space-y-2">
            {(session.improvements ?? []).map((g, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-foreground/80 tracking-tight leading-snug">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionCard>
  );
};

export default MockInterviewPanel;
