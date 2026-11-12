import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Reading job description", ms: 900 },
  { label: "Matching your resume", ms: 1400 },
  { label: "Drafting paragraphs", ms: 1800 },
  { label: "Polishing tone & phrasing", ms: 1600 },
  { label: "Finalizing letter", ms: 9999 },
];

export const DraftingOverlay = ({ active }: { active: boolean }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const tick = () => {
      if (i >= STEPS.length - 1) return;
      const t = setTimeout(() => {
        i += 1;
        setStep(i);
        tick();
      }, STEPS[i].ms);
      timers.push(t);
    };
    tick();
    return () => timers.forEach(clearTimeout);
  }, [active]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 rounded-[inherit] bg-background/70 backdrop-blur-sm animate-fade-in">
      {/* Skeleton lines behind */}
      <div className="absolute inset-x-6 sm:inset-x-12 top-6 bottom-24 space-y-2.5 opacity-70 pointer-events-none">
        <div className="skeleton-shimmer h-3 w-1/3" />
        <div className="skeleton-shimmer h-3 w-1/4" />
        <div className="skeleton-shimmer h-3 w-2/3 mt-6" />
        <div className="skeleton-shimmer h-3 w-full" />
        <div className="skeleton-shimmer h-3 w-[92%]" />
        <div className="skeleton-shimmer h-3 w-[88%]" />
        <div className="skeleton-shimmer h-3 w-[95%]" />
        <div className="skeleton-shimmer h-3 w-[80%]" />
        <div className="skeleton-shimmer h-3 w-full mt-6" />
        <div className="skeleton-shimmer h-3 w-[90%]" />
        <div className="skeleton-shimmer h-3 w-[70%]" />
      </div>

      {/* Steps card */}
      <div className="relative glass-strong rounded-2xl px-5 py-4 min-w-[260px] shine-button">
        <p className="text-[10.5px] tracking-[0.22em] uppercase text-foreground/45 font-medium mb-3">
          Drafting your letter
        </p>
        <ul className="space-y-2">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li
                key={s.label}
                className={cn(
                  "flex items-center gap-2.5 text-[12.5px] tracking-tight transition-colors",
                  done && "text-foreground/70",
                  active && "text-foreground step-pop",
                  !done && !active && "text-foreground/35",
                )}
              >
                <span className="w-4 h-4 inline-flex items-center justify-center">
                  {done ? (
                    <Check className="w-3.5 h-3.5 text-sky-700" />
                  ) : active ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/25" />
                  )}
                </span>
                <span>{s.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
