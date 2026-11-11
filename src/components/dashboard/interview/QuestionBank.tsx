import { MessageCircle, Cpu, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Question bank preview grid shown before a practice session starts,
 * so the page never feels empty. Blush-tinted accents to match this page.
 */
type Category = {
  key: "behavioral" | "technical" | "situational";
  label: string;
  icon: typeof MessageCircle;
  samples: string[];
};

const CATEGORIES: Category[] = [
  {
    key: "behavioral",
    label: "Behavioral",
    icon: MessageCircle,
    samples: [
      "Tell me about a time you pushed back on a stakeholder.",
      "Describe a project that failed — what did you learn?",
    ],
  },
  {
    key: "technical",
    label: "Technical",
    icon: Cpu,
    samples: [
      "Walk me through how you'd debug a slow SQL query.",
      "How would you design a metric to measure feature adoption?",
    ],
  },
  {
    key: "situational",
    label: "Situational",
    icon: Compass,
    samples: [
      "Your teammate misses a deadline the day of launch — what do you do?",
      "Two senior leaders disagree on the roadmap. How do you unblock it?",
    ],
  },
];

export const QuestionBank = ({
  onPick,
  currentType,
}: {
  onPick?: (type: "behavioral" | "technical" | "case") => void;
  currentType?: string;
}) => {
  const mapType = (k: Category["key"]) =>
    k === "situational" ? "case" : (k as "behavioral" | "technical");
  return (
    <div className="mt-6">
      <p className="text-[10.5px] tracking-[0.22em] uppercase text-foreground/45 font-medium">
        Question bank · preview
      </p>
      <p className="mt-1 text-[12.5px] text-foreground/60 tracking-tight">
        A taste of what you'll get. Every question in practice is written from your resume.
      </p>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const active = currentType === mapType(c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onPick?.(mapType(c.key))}
              className={cn(
                "text-left rounded-2xl border p-4 transition-all group",
                "bg-gradient-to-br from-[#FFF2F4] to-white dark:from-[#2a1a1e] dark:to-transparent",
                active
                  ? "border-[#E88FA0] shadow-[0_10px_30px_-18px_rgba(232,143,160,0.6)]"
                  : "border-foreground/[0.08] hover:border-[#E88FA0]/60 hover:-translate-y-0.5",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl grid place-items-center bg-[#E88FA0]/15 text-[#B25064] dark:text-[#F2A8B4]">
                  <Icon className="w-4 h-4" />
                </span>
                <p className="text-[13px] font-semibold tracking-tight text-foreground">
                  {c.label}
                </p>
              </div>
              <ul className="mt-3 space-y-2">
                {c.samples.map((s, i) => (
                  <li
                    key={i}
                    className="text-[12px] leading-snug tracking-tight text-foreground/70 border-l-2 border-[#E88FA0]/40 pl-2"
                  >
                    "{s}"
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[10.5px] uppercase tracking-[0.18em] text-[#B25064] dark:text-[#F2A8B4] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Use this category →
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionBank;
