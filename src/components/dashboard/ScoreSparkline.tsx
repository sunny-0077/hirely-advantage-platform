import { useId } from "react";
import { cn } from "@/lib/utils";

interface ScoreSparklineProps {
  /** 30 daily score values, oldest → newest. Defaults to a realistic 82 → 94 ramp. */
  data?: number[];
  className?: string;
}

const DEFAULT_DATA = [
  82, 82, 81, 83, 82, 84, 83, 85, 84, 86, 85, 87, 86, 88, 87,
  89, 88, 90, 89, 90, 91, 90, 92, 91, 92, 93, 92, 93, 93, 94,
];

/**
 * Inline 30-day score sparkline. Pure SVG (no chart lib).
 * Renders a gradient trend line, a soft area fill, and a "today" marker.
 */
export const ScoreSparkline = ({ data = DEFAULT_DATA, className }: ScoreSparklineProps) => {
  const gradId = useId();
  const areaId = useId();
  const start = data[0];
  const end = data[data.length - 1];
  const delta = end - start;
  const min = Math.min(...data) - 2;
  const max = Math.max(...data) + 2;
  const width = 100;
  const height = 28;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / (max - min)) * height;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <div
      className={cn(
        "rounded-2xl bg-card/45 backdrop-blur-xl border border-white/70 px-5 py-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            Score · last 30 days
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-[20px] font-semibold tracking-[-0.025em] text-foreground leading-none tabular-nums">
              {start} <span className="text-foreground/30">→</span> {end}
            </p>
            <span className="text-[11.5px] font-medium text-[hsl(258_38%_52%)]">
              {delta >= 0 ? "+" : ""}
              {delta} pts
            </span>
          </div>
        </div>
        <p className="text-[10.5px] text-foreground/40 hidden sm:block">
          {data.length} daily snapshots
        </p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="mt-3 w-full h-10 overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0E0B1F" />
            <stop offset="100%" stopColor="#6D54B3" />
          </linearGradient>
          <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6D54B3" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#6D54B3" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill={`url(#${areaId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={lastX}
          cy={lastY}
          r="2.4"
          fill="#fff"
          stroke="#6D54B3"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};
