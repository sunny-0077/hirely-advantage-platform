import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** Faded sample of what the real output will look like. Rendered at 35% opacity + light blur. */
  preview?: ReactNode;
  previewImage?: string;
  className?: string;
}

/**
 * Reusable empty state for dashboard pages/sections with no data yet.
 * - 56px tinted circle icon (dark violet gradient, matches app ToolIcon language)
 * - 17px title, 13.5px muted description (max-w-sm, centered)
 * - Optional faded/blurred preview of the future output
 * - Dark shine-button CTA
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCta,
  preview,
  previewImage,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      "py-10 px-5 sm:py-14 flex flex-col items-center text-center",
      className,
    )}
  >
    <div
      className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground"
    >
      <Icon className="w-[22px] h-[22px]" strokeWidth={1.6} />
    </div>

    <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-foreground">
      {title}
    </h3>
    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground max-w-sm">
      {description}
    </p>

    {(preview || previewImage) && (
      <div
        aria-hidden
        className="mt-6 w-full max-w-md pointer-events-none select-none opacity-25"
      >
        {preview ?? (
          <img src={previewImage} alt="" className="w-full rounded-xl" />
        )}
      </div>
    )}

    {ctaLabel && onCta && (
      <Button
        type="button"
        onClick={onCta}
        className="mt-6"
      >
        {ctaLabel}
      </Button>
    )}
  </div>
);

export default EmptyState;

/* --------------------- Reusable faded preview mocks --------------------- */

/** Faded score-card mock (Resume Analyzer). */
export const PreviewScoreCard = () => (
  <div className="rounded-2xl border border-foreground/10 bg-card/70 p-5 text-left">
    <div className="flex items-center justify-between">
      <div>
        <div className="h-2 w-24 rounded-full bg-foreground/15" />
        <div className="mt-2 h-3 w-40 rounded-full bg-foreground/25" />
      </div>
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-[5px] border-foreground/10" />
        <div
          className="absolute inset-0 rounded-full border-[5px] border-transparent border-t-primary rotate-90"
        />
        <div className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold">
          —
        </div>
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-1.5 w-full rounded-full bg-foreground/10">
        <div className="h-full w-[78%] rounded-full bg-foreground/40" />
      </div>
      <div className="h-1.5 w-full rounded-full bg-foreground/10">
        <div className="h-full w-[64%] rounded-full bg-foreground/40" />
      </div>
      <div className="h-1.5 w-full rounded-full bg-foreground/10">
        <div className="h-full w-[45%] rounded-full bg-foreground/40" />
      </div>
    </div>
  </div>
);

/** Faded cover-letter snippet mock. */
export const PreviewCoverLetter = () => (
  <div className="rounded-2xl border border-foreground/10 bg-card/70 p-6 text-left space-y-2">
    <div className="h-2 w-32 rounded-full bg-foreground/20" />
    <div className="h-2 w-24 rounded-full bg-foreground/15" />
    <div className="pt-3 space-y-1.5">
      <div className="h-2 w-full rounded-full bg-foreground/15" />
      <div className="h-2 w-[95%] rounded-full bg-foreground/15" />
      <div className="h-2 w-[88%] rounded-full bg-foreground/15" />
      <div className="h-2 w-[92%] rounded-full bg-foreground/15" />
      <div className="h-2 w-[70%] rounded-full bg-foreground/15" />
    </div>
    <div className="pt-3 space-y-1.5">
      <div className="h-2 w-[80%] rounded-full bg-foreground/15" />
      <div className="h-2 w-[60%] rounded-full bg-foreground/15" />
    </div>
    <div className="pt-4">
      <div className="h-2 w-20 rounded-full bg-foreground/25" />
    </div>
  </div>
);

/** Faded head-to-head comparison summary mock. */
export const PreviewCompare = () => (
  <div className="rounded-2xl border border-foreground/10 bg-card/70 p-4 text-left">
    <div className="flex items-center justify-between">
      <div className="h-2 w-28 rounded-full bg-foreground/20" />
      <div className="flex items-center gap-1.5">
        <div className="h-4 w-4 rounded-full bg-foreground/25" />
        <div className="h-2 w-10 rounded-full bg-foreground/20" />
      </div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3">
      {[
        { s: "A", val: "—", w: "82%", winner: true },
        { s: "B", val: "—", w: "68%", winner: false },
      ].map((c) => (
        <div
          key={c.s}
          className={cn(
            "rounded-xl border p-3",
            c.winner ? "border-foreground/25 bg-foreground/[0.04]" : "border-foreground/10",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold text-foreground/60">Resume {c.s}</div>
            {c.winner && <div className="h-2 w-8 rounded-full bg-foreground/30" />}
          </div>
          <div className="mt-2 text-[22px] font-semibold text-foreground/70">{c.val}</div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-foreground/10">
            <div className="h-full rounded-full bg-foreground/40" style={{ width: c.w }} />
          </div>
        </div>
      ))}
    </div>
    <div className="mt-4 space-y-1.5">
      <div className="h-2 w-[85%] rounded-full bg-foreground/15" />
      <div className="h-2 w-[70%] rounded-full bg-foreground/15" />
    </div>
  </div>
);

/** Faded list/timeline mock — generic fallback. */
export const PreviewList = () => (
  <div className="rounded-2xl border border-foreground/10 bg-card/70 p-4 space-y-3 text-left">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-foreground/10" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2 w-[70%] rounded-full bg-foreground/20" />
          <div className="h-2 w-[45%] rounded-full bg-foreground/10" />
        </div>
        <div className="h-5 w-14 rounded-full bg-foreground/10" />
      </div>
    ))}
  </div>
);

/** Faded applications tracker mock — kanban-style columns. */
export const PreviewApplications = () => {
  const cols: { count: number; rows: number[] }[] = [
    { count: 8, rows: [70, 55] },
    { count: 3, rows: [80, 60, 45] },
    { count: 1, rows: [65] },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 text-left">
      {cols.map((c, ci) => (
        <div key={ci} className="rounded-xl border border-foreground/10 bg-card/70 p-2.5">
          <div className="flex items-center justify-between">
            <div className="h-1.5 w-10 rounded-full bg-foreground/25" />
            <div className="h-4 w-4 rounded-full bg-foreground/15 text-[9px] font-semibold flex items-center justify-center text-foreground/50">
              {c.count}
            </div>
          </div>
          <div className="mt-2.5 space-y-1.5">
            {c.rows.map((w, i) => (
              <div key={i} className="rounded-md bg-foreground/[0.06] p-2 space-y-1">
                <div className="h-1.5 rounded-full bg-foreground/25" style={{ width: `${w}%` }} />
                <div className="h-1.5 w-[50%] rounded-full bg-foreground/10" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
