import { Upload, ArrowUpRight, Minus } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { cn } from "@/lib/utils";

// Distinct accent colors for Resume A (blue) and Resume B (lilac).
export const A_COLOR = "hsl(215 85% 55%)";
export const A_TINT = "hsl(215 85% 55% / 0.12)";
export const A_SOFT = "hsl(215 85% 55% / 0.28)";
export const B_COLOR = "hsl(268 62% 62%)";
export const B_TINT = "hsl(268 62% 62% / 0.12)";
export const B_SOFT = "hsl(268 62% 62% / 0.28)";

type Side = "A" | "B";

type Scores = {
  overall: number;
  ats: number;
  keyword: number;
  impact: number;
  formatting: number;
};

type Props = {
  a: Scores | null;
  b: Scores | null;
  labelA?: string;
  labelB?: string;
};

const CATEGORIES: { key: keyof Omit<Scores, "overall">; label: string }[] = [
  { key: "formatting", label: "Formatting" },
  { key: "keyword", label: "Keyword Match" },
  { key: "impact", label: "Impact Language" },
  { key: "ats", label: "ATS Compatibility" },
];

export const CompareScorePanel = ({ a, b, labelA, labelB }: Props) => {
  const bothReady = !!a && !!b;
  const delta = bothReady ? Math.round(b!.overall - a!.overall) : 0;
  const deltaSide: Side | "tie" =
    delta === 0 ? "tie" : delta > 0 ? "B" : "A";
  const deltaColor =
    deltaSide === "tie"
      ? "hsl(220 10% 55%)"
      : deltaSide === "A"
        ? A_COLOR
        : B_COLOR;
  const deltaTint =
    deltaSide === "tie"
      ? "hsl(220 10% 55% / 0.12)"
      : deltaSide === "A"
        ? A_TINT
        : B_TINT;

  return (
    <SectionCard className="space-y-6">
      <div>
        <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
          Score comparison
        </p>
        <p className="mt-1 text-[13.5px] text-foreground/65 tracking-tight">
          Side-by-side scores with a category breakdown once both resumes are graded.
        </p>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto_1fr] items-center gap-4">
        <ScoreRingCard side="A" score={a} label={labelA} />

        <DeltaBanner
          ready={bothReady}
          delta={delta}
          side={deltaSide}
          color={deltaColor}
          tint={deltaTint}
          labelA={labelA}
          labelB={labelB}
        />

        <ScoreRingCard side="B" score={b} label={labelB} />
      </div>

      <div className="pt-2 border-t border-foreground/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            Category breakdown
          </p>
          <div className="flex items-center gap-3 text-[11px] text-foreground/60 tracking-tight">
            <LegendDot color={A_COLOR} label="Resume A" />
            <LegendDot color={B_COLOR} label="Resume B" />
          </div>
        </div>

        <div className="space-y-3.5">
          {CATEGORIES.map((c) => (
            <CategoryRow
              key={c.key}
              label={c.label}
              a={a?.[c.key] ?? null}
              b={b?.[c.key] ?? null}
            />
          ))}
        </div>
      </div>
    </SectionCard>
  );
};

const ScoreRingCard = ({
  side,
  score,
  label,
}: {
  side: Side;
  score: Scores | null;
  label?: string;
}) => {
  const color = side === "A" ? A_COLOR : B_COLOR;
  const tint = side === "A" ? A_TINT : B_TINT;
  const soft = side === "A" ? A_SOFT : B_SOFT;
  const ready = !!score;
  const value = ready ? Math.round(score!.overall) : 0;

  return (
    <div
      className={cn(
        "rounded-2xl p-5 flex flex-col items-center text-center min-h-[220px] justify-between transition-colors",
        ready ? "border" : "border-2 border-dashed",
      )}
      style={{
        borderColor: ready ? soft : "hsl(220 10% 70% / 0.35)",
        background: ready ? tint : "transparent",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: color }}
          aria-hidden
        />
        <p
          className="text-[10.5px] tracking-[0.18em] uppercase font-semibold"
          style={{ color }}
        >
          Resume {side}
        </p>
      </div>

      <Ring value={value} color={color} ghost={!ready} />

      {ready ? (
        <p className="text-[12px] text-foreground/70 tracking-tight truncate max-w-full">
          {label ?? `Resume ${side}`}
        </p>
      ) : (
        <div className="flex items-center gap-1.5 text-[12px] text-foreground/55 tracking-tight">
          <Upload className="w-3 h-3" />
          Upload resume {side}
        </div>
      )}
    </div>
  );
};

const Ring = ({
  value,
  color,
  ghost,
}: {
  value: number;
  color: string;
  ghost?: boolean;
}) => {
  const size = 108;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className={ghost ? "text-foreground/[0.08]" : "text-foreground/[0.08]"}
          strokeDasharray={ghost ? "4 6" : undefined}
        />
        {!ghost && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 700ms ease" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {ghost ? (
          <span className="text-[22px] font-semibold text-foreground/25 tracking-tight">
            —
          </span>
        ) : (
          <>
            <span
              className="text-[26px] font-semibold tracking-[-0.02em]"
              style={{ color }}
            >
              {value}
            </span>
            <span className="text-[10px] text-foreground/50 tracking-tight -mt-0.5">
              / 100
            </span>
          </>
        )}
      </div>
    </div>
  );
};

const DeltaBanner = ({
  ready,
  delta,
  side,
  color,
  tint,
  labelA,
  labelB,
}: {
  ready: boolean;
  delta: number;
  side: Side | "tie";
  color: string;
  tint: string;
  labelA?: string;
  labelB?: string;
}) => {
  if (!ready) {
    return (
      <div className="hidden sm:flex flex-col items-center gap-2 px-2">
        <div className="w-9 h-9 rounded-full border-2 border-dashed border-foreground/20 flex items-center justify-center">
          <Minus className="w-3.5 h-3.5 text-foreground/35" />
        </div>
        <p className="text-[10.5px] text-foreground/45 tracking-tight text-center max-w-[110px] leading-tight">
          Analyze both to see the delta
        </p>
      </div>
    );
  }

  if (side === "tie") {
    return (
      <div
        className="px-3 py-2.5 rounded-2xl border flex flex-col items-center gap-1"
        style={{ background: tint, borderColor: color + "55" }}
      >
        <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold text-foreground/60">
          Tied
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          0 points
        </span>
        <span className="text-[10.5px] text-foreground/55 tracking-tight">
          Even match
        </span>
      </div>
    );
  }

  const winnerLabel = side === "A" ? labelA ?? "Resume A" : labelB ?? "Resume B";
  const positive = delta > 0;
  const abs = Math.abs(delta);

  return (
    <div
      className="px-3.5 py-3 rounded-2xl border flex flex-col items-center gap-1 shadow-sm"
      style={{
        background: tint,
        borderColor: color + "66",
      }}
    >
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] tracking-[0.16em] uppercase font-semibold"
        style={{ background: color, color: "white" }}
      >
        <ArrowUpRight className="w-3 h-3" />
        {positive ? "Resume B" : "Resume A"}
      </span>
      <span
        className="text-[22px] font-semibold tracking-[-0.02em] leading-none mt-1"
        style={{ color }}
      >
        +{abs}
      </span>
      <span className="text-[10.5px] text-foreground/60 tracking-tight text-center leading-tight max-w-[130px] truncate">
        points — {winnerLabel}
      </span>
    </div>
  );
};

const CategoryRow = ({
  label,
  a,
  b,
}: {
  label: string;
  a: number | null;
  b: number | null;
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[12px] font-medium tracking-tight text-foreground/80">
          {label}
        </p>
        <div className="flex items-center gap-3 text-[11px] font-medium tracking-tight tabular-nums">
          <span style={{ color: A_COLOR }}>
            {a !== null ? Math.round(a) : "—"}
          </span>
          <span className="text-foreground/25">·</span>
          <span style={{ color: B_COLOR }}>
            {b !== null ? Math.round(b) : "—"}
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <Bar value={a} color={A_COLOR} tint={A_TINT} />
        <Bar value={b} color={B_COLOR} tint={B_TINT} />
      </div>
    </div>
  );
};

const Bar = ({
  value,
  color,
  tint,
}: {
  value: number | null;
  color: string;
  tint: string;
}) => {
  const pct = value !== null ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div
      className="h-2 rounded-full overflow-hidden"
      style={{ background: value !== null ? tint : "hsl(220 10% 90% / 0.4)" }}
    >
      {value !== null && (
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: color,
            transition: "width 700ms ease",
          }}
        />
      )}
    </div>
  );
};

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span
      className="w-2 h-2 rounded-full"
      style={{ background: color }}
      aria-hidden
    />
    {label}
  </span>
);
