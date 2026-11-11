import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared framed tools; dark tone uses the semantic highlight surface.
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
      dark: "highlight-panel border border-highlight",
    };
    return (
      <div ref={ref} className={cn(base, tones[tone], className)} {...props}>
        {children}
      </div>
    );
  },
);
SectionCard.displayName = "SectionCard";
