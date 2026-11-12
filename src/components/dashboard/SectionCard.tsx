import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared workspace card with comfortable, compact spacing.
 * `tone="dark"` switches to the semantic highlight panel.
 */
type SectionCardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "glass" | "dark" | "subtle";
};

export const SectionCard = forwardRef<HTMLDivElement, SectionCardProps>(
  ({ className, tone = "glass", children, ...props }, ref) => {
    const base = "rounded-lg p-4 sm:p-5";
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
