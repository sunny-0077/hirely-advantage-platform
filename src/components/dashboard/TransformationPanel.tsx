import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Sparkles } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { cn } from "@/lib/utils";

type Breakdown = {
  ats_compatibility?: number;
  impact_statements?: number;
  relevance?: number;
  clarity?: number;
  keyword_match?: number;
};

export type VersionLite = {
  id: string;
  created_at: string;
  overall_score: number;
  ats_score: number;
  summary?: string | null;
  score_breakdown?: Breakdown | null;
  extracted?: {
    skills?: string[];
    keywords?: string[];
  } | null;
  issues?: {
    weak_bullets?: unknown[];
    grammar_issues?: unknown[];
    formatting_problems?: unknown[];
    ats_problems?: unknown[];
  } | null;
};

type Props = {
  versions: VersionLite[];
  className?: string;
};

const BREAKDOWN_LABELS: { key: keyof Breakdown; label: string }[] = [
  { key: "ats_compatibility", label: "ATS compatibility" },
  { key: "impact_statements", label: "Impact statements" },
  { key: "relevance", label: "Relevance" },
  { key: "clarity", label: "Clarity" },
  { key: "keyword_match", label: "Keyword match" },
];

const issueCount = (v: VersionLite) =>
  (v.issues?.weak_bullets?.length ?? 0) +
  (v.issues?.grammar_issues?.length ?? 0) +
  (v.issues?.formatting_problems?.length ?? 0) +
  (v.issues?.ats_problems?.length ?? 0);

export const TransformationPanel = ({ versions, className }: Props) => {
  // Newest first expected. After = newest, Before = oldest by default.
  const sorted = useMemo(
    () => [...versions].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    [versions],
  );

  const [afterId, setAfterId] = useState<string | null>(null);
  const [beforeId, setBeforeId] = useState<string | null>(null);

  useEffect(() => {
    if (!sorted.length) return;
    setAfterId((cur) => cur ?? sorted[0].id);
    setBeforeId((cur) => cur ?? sorted[sorted.length - 1].id);
  }, [sorted]);

  const after = sorted.find((v) => v.id === afterId);
  const before = sorted.find((v) => v.id === beforeId);

  if (!sorted.length) {
    return (
      <SectionCard className={className}>
        <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
          No history yet
        </p>
        <p className="mt-2 text-[14px] text-foreground/70 tracking-tight leading-snug">
          Upload a resume to start building your transformation timeline.
        </p>
      </SectionCard>
    );
  }

  if (sorted.length === 1) {
    return (
      <div className={cn("space-y-4", className)}>
        <SectionCard>
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            One version saved
          </p>
          <p className="mt-2 text-[14px] text-foreground/70 tracking-tight leading-snug">
            Re-upload an improved resume to unlock the Before vs After view — we'll show exactly
            what improved, in green.
          </p>
          <div className="mt-4">
            <VersionRow v={sorted[0]} active />
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Hero transformation card */}
      {before && after && before.id !== after.id && (
        <TransformationHero before={before} after={after} />
      )}

      {/* Side-by-side comparison */}
      {before && after && before.id !== after.id && (
        <CompareCard before={before} after={after} />
      )}

      {/* Version timeline */}
      <SectionCard className="p-0 overflow-hidden">
        <div className="px-5 sm:px-6 pt-5 pb-3 flex items-center justify-between">
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            Saved versions · {sorted.length}
          </p>
          <p className="text-[11px] text-foreground/50 tracking-tight">
            Tap to set as Before / After
          </p>
        </div>
        <ul className="border-t border-foreground/[0.06] divide-y divide-foreground/[0.06]">
          {sorted.map((v, i) => {
            const isAfter = v.id === afterId;
            const isBefore = v.id === beforeId;
            return (
              <li
                key={v.id}
                className={cn(
                  "px-5 sm:px-6 py-3.5 flex items-center gap-3 transition-colors",
                  (isAfter || isBefore) && "bg-foreground/[0.02]",
                )}
              >
                <div className="shrink-0 w-7 h-7 rounded-full bg-foreground/[0.05] grid place-items-center text-[11px] font-medium text-foreground/65 tabular-nums">
                  {sorted.length - i}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium tracking-tight text-foreground tabular-nums">
                    Score {v.overall_score}
                    <span className="text-foreground/40 font-normal"> · ATS {v.ats_score}</span>
                  </p>
                  <p className="text-[11px] text-foreground/50 tracking-tight">
                    {new Date(v.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBeforeId(v.id)}
                    disabled={isAfter}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] tracking-tight border transition-colors",
                      isBefore
                        ? "bg-foreground/[0.06] border-foreground/15 text-foreground/80"
                        : "bg-transparent border-foreground/[0.08] text-foreground/55 hover:bg-foreground/[0.04] disabled:opacity-30 disabled:cursor-not-allowed",
                    )}
                  >
                    Before
                  </button>
                  <button
                    type="button"
                    onClick={() => setAfterId(v.id)}
                    disabled={isBefore}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] tracking-tight border transition-colors",
                      isAfter
                        ? "bg-[hsl(150_55%_45%/0.12)] border-[hsl(150_55%_45%/0.25)] text-[hsl(150_45%_28%)]"
                        : "bg-transparent border-foreground/[0.08] text-foreground/55 hover:bg-foreground/[0.04] disabled:opacity-30 disabled:cursor-not-allowed",
                    )}
                  >
                    After
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </div>
  );
};

const VersionRow = ({ v, active }: { v: VersionLite; active?: boolean }) => (
  <div
    className={cn(
      "rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3",
      active ? "bg-foreground/[0.04]" : "bg-foreground/[0.02]",
    )}
  >
    <div>
      <p className="text-[13px] font-medium tracking-tight tabular-nums">
        Score {v.overall_score} · ATS {v.ats_score}
      </p>
      <p className="text-[11px] text-foreground/50">
        {new Date(v.created_at).toLocaleString()}
      </p>
    </div>
  </div>
);

// ============== Hero transformation card ==============
const TransformationHero = ({ before, after }: { before: VersionLite; after: VersionLite }) => {
  const delta = after.overall_score - before.overall_score;
  const atsDelta = after.ats_score - before.ats_score;
  const improved = delta > 0;
  const same = delta === 0;

  return (
    <SectionCard tone="dark" className="p-0 overflow-hidden">
      <div className="px-5 sm:px-6 pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-white/55 font-medium">
            Your transformation
          </p>
          <p className="mt-2 text-[28px] sm:text-[34px] leading-[1.05] font-semibold tracking-[-0.035em] text-white">
            {improved ? (
              <>
                You moved up{" "}
                <span className="text-[hsl(140_60%_70%)]">+{delta} points</span>.
              </>
            ) : same ? (
              <>Same score — let's push it higher.</>
            ) : (
              <>Score dipped {delta} pts — let's recover it.</>
            )}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-tight",
            improved
              ? "bg-[hsl(150_55%_45%/0.18)] text-[hsl(140_60%_75%)]"
              : same
              ? "bg-white/10 text-white/70"
              : "bg-[hsl(0_70%_55%/0.18)] text-[hsl(0_70%_80%)]",
          )}
        >
          {improved ? <TrendingUp className="w-3 h-3" /> : same ? <Minus className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {improved ? `+${delta}` : same ? "0" : `${delta}`} overall
        </span>
      </div>

      <div className="border-t border-white/[0.08] px-5 sm:px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <BigScore label="Before" value={before.overall_score} when={before.created_at} muted />
        <BigScore label="After" value={after.overall_score} when={after.created_at} accent />
      </div>

      <div className="border-t border-white/[0.08] px-5 sm:px-6 py-4 grid grid-cols-2 gap-4">
        <MiniDelta label="Overall" delta={delta} />
        <MiniDelta label="ATS" delta={atsDelta} />
      </div>
    </SectionCard>
  );
};

const BigScore = ({
  label,
  value,
  when,
  muted,
  accent,
}: {
  label: string;
  value: number;
  when: string;
  muted?: boolean;
  accent?: boolean;
}) => (
  <div>
    <p className="text-[10.5px] tracking-[0.18em] uppercase text-white/45 font-medium">{label}</p>
    <p
      className={cn(
        "mt-1 text-[56px] leading-none font-semibold tabular-nums tracking-[-0.04em]",
        muted ? "text-white/55" : "text-white",
      )}
    >
      {value}
      <span className="text-[18px] text-white/30">/100</span>
    </p>
    <div className="mt-3 h-[4px] rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full transition-[width] duration-1000 ease-out"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: accent
            ? "linear-gradient(90deg,hsl(140 60% 65%),hsl(150 55% 75%))"
            : "linear-gradient(90deg,hsl(0 0% 100% / 0.3),hsl(0 0% 100% / 0.55))",
        }}
      />
    </div>
    <p className="mt-2 text-[11px] text-white/45 tracking-tight">
      {new Date(when).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
    </p>
  </div>
);

const MiniDelta = ({ label, delta }: { label: string; delta: number }) => {
  const up = delta > 0;
  const down = delta < 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11.5px] text-white/55 tracking-tight">{label}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[12px] font-medium tabular-nums tracking-tight",
          up
            ? "text-[hsl(140_60%_75%)]"
            : down
            ? "text-[hsl(0_70%_80%)]"
            : "text-white/60",
        )}
      >
        {up ? <ArrowUpRight className="w-3 h-3" /> : down ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
        {up ? `+${delta}` : delta}
      </span>
    </div>
  );
};

// ============== Compare card (per-axis bars + counts) ==============
const CompareCard = ({ before, after }: { before: VersionLite; after: VersionLite }) => {
  const beforeIssues = issueCount(before);
  const afterIssues = issueCount(after);
  const issuesDelta = afterIssues - beforeIssues; // negative is good
  const skillsDelta = (after.extracted?.skills?.length ?? 0) - (before.extracted?.skills?.length ?? 0);
  const keywordsDelta = (after.extracted?.keywords?.length ?? 0) - (before.extracted?.keywords?.length ?? 0);

  return (
    <SectionCard className="p-0 overflow-hidden">
      <div className="px-5 sm:px-6 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            Before vs After · what changed
          </p>
          <p className="mt-1 text-[12.5px] text-foreground/55 tracking-tight">
            Improvements highlighted in green.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-foreground/55">
          <Sparkles className="w-3 h-3" />
          live diff
        </span>
      </div>

      <div className="border-t border-foreground/[0.06] px-5 sm:px-6 py-4 space-y-3.5">
        {BREAKDOWN_LABELS.map(({ key, label }) => (
          <CompareBar
            key={key}
            label={label}
            before={Math.round(before.score_breakdown?.[key] ?? 0)}
            after={Math.round(after.score_breakdown?.[key] ?? 0)}
          />
        ))}
      </div>

      <div className="border-t border-foreground/[0.06] px-5 sm:px-6 py-4 grid grid-cols-3 gap-3">
        <CountTile label="Skills" before={before.extracted?.skills?.length ?? 0} after={after.extracted?.skills?.length ?? 0} delta={skillsDelta} positiveUp />
        <CountTile label="Keywords" before={before.extracted?.keywords?.length ?? 0} after={after.extracted?.keywords?.length ?? 0} delta={keywordsDelta} positiveUp />
        <CountTile label="Issues" before={beforeIssues} after={afterIssues} delta={issuesDelta} positiveUp={false} />
      </div>
    </SectionCard>
  );
};

const CompareBar = ({
  label,
  before,
  after,
}: {
  label: string;
  before: number;
  after: number;
}) => {
  const delta = after - before;
  const up = delta > 0;
  const down = delta < 0;
  const b = Math.max(0, Math.min(100, before));
  const a = Math.max(0, Math.min(100, after));

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-foreground/75 tracking-tight">{label}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11.5px] font-medium tabular-nums tracking-tight",
            up
              ? "text-[hsl(150_45%_28%)]"
              : down
              ? "text-[hsl(0_60%_45%)]"
              : "text-foreground/50",
          )}
        >
          <span className="text-foreground/45 font-normal">{before}</span>
          <ArrowUpRight
            className={cn(
              "w-3 h-3",
              up ? "" : down ? "rotate-90" : "opacity-30",
            )}
          />
          {after}
          <span
            className={cn(
              "ml-1 px-1.5 py-0.5 rounded-full text-[10px]",
              up
                ? "bg-[hsl(150_55%_45%/0.12)]"
                : down
                ? "bg-[hsl(0_70%_55%/0.10)]"
                : "bg-foreground/[0.05]",
            )}
          >
            {up ? `+${delta}` : delta === 0 ? "—" : delta}
          </span>
        </span>
      </div>
      {/* Stacked bar: before (muted) underneath, after (accent) on top */}
      <div className="mt-1.5 relative h-[6px] rounded-full bg-foreground/[0.05] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-foreground/15 transition-[width] duration-700"
          style={{ width: `${b}%` }}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-out",
          )}
          style={{
            width: `${a}%`,
            background: up
              ? "linear-gradient(90deg,hsl(150 55% 40%),hsl(140 60% 55%))"
              : down
              ? "linear-gradient(90deg,hsl(0 60% 50%),hsl(15 70% 60%))"
              : "linear-gradient(90deg,#0E0B1F,#6D54B3)",
          }}
        />
      </div>
    </div>
  );
};

const CountTile = ({
  label,
  before,
  after,
  delta,
  positiveUp,
}: {
  label: string;
  before: number;
  after: number;
  delta: number;
  positiveUp: boolean;
}) => {
  const isImprovement = positiveUp ? delta > 0 : delta < 0;
  const isRegression = positiveUp ? delta < 0 : delta > 0;
  return (
    <div
      className={cn(
        "rounded-xl px-3.5 py-3 border",
        isImprovement
          ? "bg-[hsl(150_55%_45%/0.06)] border-[hsl(150_55%_45%/0.18)]"
          : isRegression
          ? "bg-[hsl(0_70%_55%/0.05)] border-[hsl(0_70%_55%/0.14)]"
          : "bg-foreground/[0.025] border-foreground/[0.06]",
      )}
    >
      <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[11px] text-foreground/45 line-through tabular-nums">{before}</span>
        <ArrowUpRight className="w-3 h-3 text-foreground/40" />
        <span
          className={cn(
            "text-[20px] leading-none font-semibold tabular-nums tracking-[-0.02em]",
            isImprovement
              ? "text-[hsl(150_45%_28%)]"
              : isRegression
              ? "text-[hsl(0_60%_38%)]"
              : "text-foreground",
          )}
        >
          {after}
        </span>
      </div>
      <p
        className={cn(
          "mt-1 text-[11px] font-medium tabular-nums tracking-tight",
          isImprovement
            ? "text-[hsl(150_45%_32%)]"
            : isRegression
            ? "text-[hsl(0_55%_42%)]"
            : "text-foreground/50",
        )}
      >
        {delta === 0 ? "no change" : delta > 0 ? `+${delta}` : delta}
      </p>
    </div>
  );
};
