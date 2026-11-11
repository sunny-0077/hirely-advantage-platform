import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Glass card matching the landing palette.
 * `tone="dark"` switches to the deep violet-ink gradient used for accent moments.
 */
type SectionCardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "glass" | "dark" | "subtle";
};

export const SectionCard = forwardRef<HTMLDivElement, SectionCardProps>(
  ({ className, tone = "glass", children, ...props }, ref) => {
    const base = "rounded-[22px] p-6";
    const tones: Record<NonNullable<SectionCardProps["tone"]>, string> = {
      glass:
        "bg-card/55 backdrop-blur-2xl border border-white/70 shadow-[0_1px_0_hsl(0_0%_100%/0.85)_inset,0_30px_60px_-25px_hsl(var(--slate-ink)/0.12)]",
      subtle:
        "bg-card/40 backdrop-blur-xl border border-white/60",
      dark:
        "text-white border border-white/5 shadow-[0_30px_60px_-25px_hsl(252_46%_8%/0.5)] [background:linear-gradient(160deg,#0E0B1F,#3a2d5e)]",
    };
    return (
      <div ref={ref} className={cn(base, tones[tone], className)} {...props}>
        {children}
      </div>
    );
  },
);
SectionCard.displayName = "SectionCard";
