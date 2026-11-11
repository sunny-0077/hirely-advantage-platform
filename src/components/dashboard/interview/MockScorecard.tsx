import { useMemo } from "react";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { cn } from "@/lib/utils";

type Turn = {
  id: string;
  turn_index: number;
  question: string;
  answer: string | null;
  feedback: string | null;
  score: number | null;
};

/**
 * Post-session scorecard: conic-gradient score ring (visual language
 * matches Resume Analyzer) + per-question breakdown with three
 * derived sub-scores: clarity, structure, relevance.
 */
const hueFor = (score: number) => {
  if (score >= 80) return "#22C55E"; // emerald
  if (score >= 60) return "#F59E0B"; // amber
  return "#F43F5E"; // rose
};

const derive = (turn: Turn, avg: number) => {
  const base = turn.score ?? avg;
  const words = (turn.answer ?? "").split(/\s+/).filter(Boolean).length;
  const structure = /\b(first|second|then|finally|because|so that|result)\b/i.test(
    turn.answer ?? "",
  )
    ? Math.min(100, base + 5)
    : Math.max(0, base - 8);
  const clarity = words >= 60 && words <= 260 ? base : Math.max(0, base - 10);
  const relevance = /\b(\d|%|kpi|revenue|users|customers|team|shipped)\b/i.test(
    turn.answer ?? "",
  )
    ? Math.min(100, base + 4)
    : Math.max(0, base - 6);
  return {
    clarity: Math.round(clarity),
    structure: Math.round(structure),
    relevance: Math.round(relevance),
  };
};

export const MockScorecard = ({
  overall,
  turns,
}: {
  overall: number;
  turns: Turn[];
}) => {
  const answered = turns.filter((t) => t.answer);
  const avg = useMemo(() => {
    const scores = answered.map((t) => t.score).filter((s): s is number => s !== null);
    if (!scores.length) return overall;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [answered, overall]);

  const color = hueFor(overall);

  return (
    <SectionCard className="p-0 overflow-hidden ring-1 ring-[#E88FA0]/20">
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-foreground/[0.06] flex items-center gap-5">
        <div
          className="relative w-[104px] h-[104px] rounded-full shrink-0 grid place-items-center"
          style={{
            background: `conic-gradient(${color} ${overall * 3.6}deg, hsl(var(--foreground) / 0.08) 0deg)`,
          }}
        >
          <div className="w-[86px] h-[86px] rounded-full bg-background grid place-items-center">
            <div className="text-center">
              <p
                className="text-[26px] font-semibold tracking-[-0.03em] leading-none tabular-nums"
                style={{ color }}
              >
                {overall}
              </p>
              <p className="text-[9.5px] tracking-[0.2em] uppercase text-foreground/45 font-medium mt-0.5">
                / 100
              </p>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] tracking-[0.22em] uppercase text-[#B25064] dark:text-[#F2A8B4] font-medium">
            Session scorecard
          </p>
          <p className="mt-1 text-[15.5px] font-semibold tracking-tight text-foreground">
            {answered.length} question{answered.length === 1 ? "" : "s"} answered ·
            avg {avg}/100
          </p>
          <p className="mt-1 text-[12px] text-foreground/60 tracking-tight leading-snug">
            Per-question breakdown across clarity, structure and relevance.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-foreground/[0.06]">
        {answered.map((t) => {
          const d = derive(t, avg);
          return (
            <li key={t.id} className="px-5 sm:px-6 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium tracking-tight text-foreground line-clamp-2 max-w-[75%]">
                  Q{t.turn_index + 1}. {t.question}
                </p>
                <span
                  className="text-[13px] font-semibold tabular-nums"
                  style={{ color: hueFor(t.score ?? avg) }}
                >
                  {t.score ?? avg}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <SubBar label="Clarity" value={d.clarity} />
                <SubBar label="Structure" value={d.structure} />
                <SubBar label="Relevance" value={d.relevance} />
              </div>
            </li>
          );
        })}
        {!answered.length && (
          <li className="px-5 py-6 text-[13px] text-foreground/55">
            No answered questions in this session.
          </li>
        )}
      </ul>
    </SectionCard>
  );
};

const SubBar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex items-baseline justify-between">
      <p className="text-[10.5px] tracking-tight text-foreground/55">{label}</p>
      <p className="text-[10.5px] font-semibold tabular-nums text-foreground/80">
        {value}
      </p>
    </div>
    <div className="mt-1 h-1 rounded-full bg-foreground/[0.06] overflow-hidden">
      <div
        className={cn("h-full rounded-full")}
        style={{ width: `${value}%`, background: hueFor(value) }}
      />
    </div>
  </div>
);

export default MockScorecard;
