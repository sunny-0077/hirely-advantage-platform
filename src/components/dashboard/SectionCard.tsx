import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Glass card matching the landing palette.
 * `tone="dark"` switches to the dark forest-green panel used for accent moments.
 */
type SectionCardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "glass" | "dark" | "subtle";
};

export const SectionCard = forwardRef<HTMLDivElement, SectionCardProps>(
  ({ className, tone = "glass", children, ...props }, ref) => {
    const base = "rounded-lg p-6";
    const tones: Record<NonNullable<SectionCardProps["tone"]>, string> = {
      glass: "bg-card border border-border shadow-subtle",
      subtle: "bg-muted border border-border",
      dark: "panel-forest border border-forest",
    };
    return (
      <div ref={ref} className={cn(base, tones[tone], className)} {...props}>
        {children}
      </div>
    );
  },
);
SectionCard.displayName = "SectionCard";
