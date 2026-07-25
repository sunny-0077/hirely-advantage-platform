import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
      "glass-strong rounded-[24px] p-8 sm:p-12 flex flex-col items-center text-center",
      className,
    )}
  >
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_18px_40px_-18px_hsl(252_46%_8%/0.55)]"
      style={{ background: "linear-gradient(160deg,#0E0B1F,#3a2d5e)" }}
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
        className="mt-8 w-full max-w-md pointer-events-none select-none opacity-[0.35]"
        style={{ filter: "blur(1.4px) saturate(0.85)" }}
      >
        {preview ?? (
          <img src={previewImage} alt="" className="w-full rounded-xl" />
        )}
      </div>
    )}

    {ctaLabel && onCta && (
      <button
        type="button"
        onClick={onCta}
        className="shine-button mt-8 inline-flex items-center justify-center rounded-full bg-foreground text-background px-5 py-2.5 text-[13px] font-medium tracking-tight hover:opacity-90 transition-opacity"
      >
        {ctaLabel}
      </button>
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
          className="absolute inset-0 rounded-full border-[5px] border-transparent"
          style={{ borderTopColor: "hsl(258 38% 52%)", transform: "rotate(120deg)" }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold">
          82
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

/** Faded head-to-head comparison mock. */
export const PreviewCompare = () => (
  <div className="grid grid-cols-2 gap-3">
    {["A", "B"].map((s) => (
      <div key={s} className="rounded-2xl border border-foreground/10 bg-card/70 p-4">
        <div className="flex items-center justify-between">
          <div className="h-2 w-16 rounded-full bg-foreground/20" />
          <div className="text-[11px] font-semibold text-foreground/60">{s}</div>
        </div>
        <div className="mt-3 h-8 w-16 rounded-md bg-foreground/15" />
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-foreground/10" />
          <div className="h-1.5 w-[80%] rounded-full bg-foreground/10" />
          <div className="h-1.5 w-[65%] rounded-full bg-foreground/10" />
        </div>
      </div>
    ))}
  </div>
);

/** Faded list/timeline mock for tracking pages. */
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
