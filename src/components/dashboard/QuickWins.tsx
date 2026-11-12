import { useState, type HTMLAttributes } from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionCard } from "./SectionCard";

type Win = {
  id: string;
  title: string;
  detail: string;
  lift: string; // e.g. "+4 pts"
  effort: string; // e.g. "30 sec"
};

const DEFAULT_WINS: Win[] = [
  {
    id: "headline",
    title: "Rewrite headline for senior PM signal",
    detail: "“Aspiring PM” → “Senior PM · 0→1 products · B2B SaaS”",
    lift: "+4 pts",
    effort: "30 sec",
  },
  {
    id: "layout",
    title: "Flatten two-column layout for ATS",
    detail: "Auto-convert sidebar into a single-column flow without losing density.",
    lift: "+5 pts",
    effort: "1 min",
  },
  {
    id: "keywords",
    title: "Add 3 missing keywords for Linear JD",
    detail: "“roadmap ownership”, “design partner”, “north-star metric”",
    lift: "+3 pts",
    effort: "45 sec",
  },
];

export type QuickWin = Win;

type QuickWinsProps = HTMLAttributes<HTMLDivElement> & {
  wins?: Win[];
};

export const QuickWins = ({ wins = DEFAULT_WINS, className, ...props }: QuickWinsProps) => {
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const apply = (id: string) =>
    setApplied((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const totalLift = wins
    .filter((w) => applied.has(w.id))
    .reduce((sum, w) => sum + (parseInt(w.lift.replace(/\D/g, ""), 10) || 0), 0);

  return (
    <SectionCard className={cn("p-0 overflow-hidden", className)} {...props}>
      <div className="px-5 sm:px-6 pt-5 pb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-full grid place-items-center bg-foreground text-background shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              Top 3 quick wins
            </p>
            <p className="text-[13px] text-foreground/65 tracking-tight truncate">
              Apply all three to reach{" "}
              <span className="font-medium text-foreground">+12 pts</span>
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/40 font-medium">
            Applied
          </p>
          <p className="text-[14px] font-semibold tracking-tight text-foreground">
            +{totalLift} <span className="text-foreground/40 font-normal">pts</span>
          </p>
        </div>
      </div>

      <ul className="border-t border-foreground/[0.06] divide-y divide-foreground/[0.06]">
        {wins.map((w, i) => {
          const isApplied = applied.has(w.id);
          return (
            <li
              key={w.id}
              className="group px-5 sm:px-6 py-4 flex items-center gap-4 hover:bg-foreground/[0.015] transition-colors"
            >
              <span className="text-[11px] font-medium text-foreground/35 tracking-tight w-5 tabular-nums">
                0{i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[13.5px] font-medium tracking-tight transition-colors",
                    isApplied ? "text-foreground/40 line-through" : "text-foreground",
                  )}
                >
                  {w.title}
                </p>
                <p className="mt-0.5 text-[12.5px] text-foreground/55 tracking-tight truncate">
                  {w.detail}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[11px] text-foreground/45 tracking-tight tabular-nums">
                <span>{w.effort}</span>
                <span className="text-[hsl(258_38%_52%)] font-medium">{w.lift}</span>
              </div>
              <button
                type="button"
                onClick={() => apply(w.id)}
                aria-pressed={isApplied}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium tracking-tight transition-all",
                  isApplied
                    ? "bg-[hsl(199_89%_48%/0.12)] text-[hsl(201_94%_32%)] hover:bg-[hsl(199_89%_48%/0.18)]"
                    : "bg-foreground text-background hover:opacity-90",
                )}
              >
                {isApplied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Applied
                  </>
                ) : (
                  "Apply"
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
};
