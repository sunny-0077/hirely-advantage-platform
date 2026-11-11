import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { SectionCard } from "./SectionCard";

type Tone = "green" | "amber" | "violet";

type Item = { text: string };

type Column = {
  label: string;
  tone: Tone;
  items: Item[];
};

export type InsightsColumn = Column;

const TONE: Record<Tone, { dot: string; chip: string; label: string }> = {
  green: {
    dot: "bg-[hsl(150_55%_45%)] shadow-[0_0_0_3px_hsl(150_55%_45%/0.16)]",
    chip: "bg-[hsl(150_55%_45%/0.10)] text-[hsl(150_45%_28%)]",
    label: "Strengths",
  },
  amber: {
    dot: "bg-[hsl(35_92%_55%)] shadow-[0_0_0_3px_hsl(35_92%_55%/0.18)]",
    chip: "bg-[hsl(35_92%_55%/0.12)] text-[hsl(28_70%_38%)]",
    label: "Gaps",
  },
  violet: {
    dot: "bg-[hsl(258_45%_58%)] shadow-[0_0_0_3px_hsl(258_45%_58%/0.18)]",
    chip: "bg-[hsl(258_45%_58%/0.12)] text-[hsl(258_38%_42%)]",
    label: "Risks",
  },
};

const DEFAULT_COLUMNS: Column[] = [
  {
    label: "Strengths",
    tone: "green",
    items: [
      { text: "Strong action verbs across every bullet" },
      { text: "Clear metrics — 7 of 9 bullets quantified" },
    ],
  },
  {
    label: "Gaps",
    tone: "amber",
    items: [
      { text: "Missing 'roadmap ownership' for senior PM roles" },
      { text: "No mention of stakeholder alignment at exec level" },
    ],
  },
  {
    label: "Risks",
    tone: "violet",
    items: [
      { text: "ATS may misparse your two-column layout" },
      { text: "Headline reads junior — drop 'aspiring'" },
    ],
  },
];

type InsightsTriadProps = HTMLAttributes<HTMLDivElement> & {
  columns?: Column[];
};

export const InsightsTriad = ({
  columns = DEFAULT_COLUMNS,
  className,
  ...props
}: InsightsTriadProps) => {
  return (
    <SectionCard className={cn("p-0 overflow-hidden", className)} {...props}>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-foreground/[0.06]">
        {columns.map((col) => {
          const t = TONE[col.tone];
          return (
            <div key={col.label} className="p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                  {col.label}
                </p>
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full tracking-tight",
                    t.chip,
                  )}
                >
                  {col.items.length}
                </span>
              </div>
              <ul className="mt-4 space-y-3">
                {col.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className={cn("mt-[7px] w-1.5 h-1.5 rounded-full shrink-0", t.dot)}
                      aria-hidden
                    />
                    <span className="text-[13px] leading-[1.5] text-foreground/75 tracking-tight">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
};
