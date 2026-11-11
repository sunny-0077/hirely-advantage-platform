import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating STAR checklist that lights up each letter as the current
 * answer covers Situation / Task / Action / Result. Heuristic-based
 * so it works for typed answers today and voice transcripts later.
 */
const detectStar = (text: string) => {
  const t = text.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean).length;
  return {
    situation:
      words >= 12 &&
      /\b(when|while|during|at\s+\w+|context|team|company|project|last\s+(year|quarter|month))\b/i.test(
        text,
      ),
    task: /\b(needed to|had to|responsible|goal|objective|task|asked to|challenge|problem|target)\b/i.test(
      text,
    ),
    action:
      words >= 30 &&
      /\b(i\s+(led|built|designed|created|analyzed|coordinated|proposed|implemented|shipped|owned|ran|refactored|migrated|automated)|we\s+(built|shipped|launched|decided))\b/i.test(
        text,
      ),
    result:
      /\b(result|resulted|increased|reduced|improved|saved|grew|drove|boosted|cut|by\s+\d|\d+\s*%|kpi|revenue|retention|conversion|nps)\b/i.test(
        text,
      ),
  };
};

const PARTS = [
  { key: "situation", label: "Situation", hint: "Set the scene — when, where, who" },
  { key: "task", label: "Task", hint: "Your goal or the problem to solve" },
  { key: "action", label: "Action", hint: "What YOU did, step by step" },
  { key: "result", label: "Result", hint: "Measurable outcome, ideally a number" },
] as const;

export const StarChecklistOverlay = ({ answer }: { answer: string }) => {
  const [open, setOpen] = useState(true);
  const state = useMemo(() => detectStar(answer), [answer]);
  const covered = Object.values(state).filter(Boolean).length;

  return (
    <div className="fixed bottom-4 right-4 z-30 w-[260px] pointer-events-auto">
      <div className="rounded-2xl border border-[#E88FA0]/25 bg-white/85 dark:bg-black/60 backdrop-blur-xl shadow-[0_20px_50px_-25px_rgba(232,143,160,0.55)] overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 border-b border-foreground/[0.06]"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded-lg grid place-items-center bg-[#E88FA0]/15 text-[#B25064] dark:text-[#F2A8B4] text-[10px] font-bold">
              {covered}/4
            </span>
            <p className="text-[11.5px] font-semibold tracking-tight text-foreground truncate">
              STAR checklist
            </p>
          </div>
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-foreground/50" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-foreground/50" />
          )}
        </button>
        {open && (
          <ul className="px-3 py-2 space-y-1.5">
            {PARTS.map((p) => {
              const on = state[p.key];
              return (
                <li key={p.key} className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 w-4 h-4 rounded-full grid place-items-center shrink-0 transition-colors",
                      on
                        ? "bg-[#E88FA0] text-white"
                        : "bg-foreground/[0.06] text-foreground/40",
                    )}
                  >
                    {on ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : null}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-[11.5px] font-medium tracking-tight leading-tight",
                        on ? "text-foreground" : "text-foreground/55",
                      )}
                    >
                      {p.label}
                    </p>
                    <p className="text-[10.5px] tracking-tight text-foreground/45 leading-snug">
                      {p.hint}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default StarChecklistOverlay;
