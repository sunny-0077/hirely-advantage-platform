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
        { s: "A", val: "84", w: "82%", winner: true },
        { s: "B", val: "71", w: "68%", winner: false },
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

/** Faded outreach mock — chat/DM threads. */
export const PreviewOutreach = () => (
  <div className="rounded-2xl border border-foreground/10 bg-card/70 p-4 space-y-3 text-left">
    {[
      { align: "left", w: "78%" },
      { align: "right", w: "62%" },
      { align: "left", w: "70%" },
      { align: "right", w: "48%" },
    ].map((m, i) => (
      <div key={i} className={cn("flex", m.align === "right" ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "rounded-2xl px-3 py-2 space-y-1",
            m.align === "right" ? "bg-foreground/25 rounded-br-sm" : "bg-foreground/[0.08] rounded-bl-sm",
          )}
          style={{ width: m.w }}
        >
          <div className={cn("h-1.5 w-full rounded-full", m.align === "right" ? "bg-background/60" : "bg-foreground/25")} />
          <div className={cn("h-1.5 w-[70%] rounded-full", m.align === "right" ? "bg-background/40" : "bg-foreground/15")} />
        </div>
      </div>
    ))}
    <div className="pt-2 flex items-center gap-2">
      <div className="h-8 flex-1 rounded-full bg-foreground/[0.06]" />
      <div className="h-8 w-8 rounded-full bg-foreground/20" />
    </div>
  </div>
);

/** Faded saved-roles mock — bookmarked role cards. */
export const PreviewSaved = () => (
  <div className="space-y-2 text-left">
    {[{ m: "92%" }, { m: "88%" }, { m: "81%" }].map((r, i) => (
      <div key={i} className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-card/70 p-3">
        <div className="w-9 h-9 rounded-lg bg-foreground/10" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2 w-[65%] rounded-full bg-foreground/25" />
          <div className="h-2 w-[40%] rounded-full bg-foreground/10" />
        </div>
        <div className="text-right space-y-1">
          <div className="text-[11px] font-semibold text-foreground/55">{r.m}</div>
          <div className="h-1.5 w-10 rounded-full bg-foreground/15 ml-auto" />
        </div>
        <div className="h-5 w-5 rounded-md bg-foreground/20" />
      </div>
    ))}
  </div>
);
