import { ATS_TEMPLATES } from "@/lib/resumeBuilder/templates";
import { ShieldCheck } from "lucide-react";

export function TemplatePicker({
  value,
  onPick,
}: {
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {ATS_TEMPLATES.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            onClick={() => onPick(t.id)}
            className={
              "text-left rounded-2xl border p-4 transition-all " +
              (active
                ? "border-violet-500/50 bg-violet-500/10 ring-1 ring-inset ring-violet-500/30"
                : "border-border/60 bg-card/60 hover:border-foreground/20")
            }
          >
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] text-emerald-300/85 mb-2">
              <ShieldCheck className="w-3 h-3" /> ATS-safe
            </div>
            <div className="text-[14.5px] font-semibold text-foreground tracking-tight">
              {t.name}
            </div>
            <div className="text-[12px] text-foreground/60 mt-1.5 leading-snug">
              {t.description}
            </div>

            {/* Tiny visual: just lines, no icons/graphics */}
            <div className="mt-4 rounded-md bg-white/95 p-3">
              <div className="h-2 w-1/2 rounded bg-foreground/70 mb-1.5" />
              <div className="h-1 w-2/3 rounded bg-foreground/30 mb-3" />
              <div className="h-1.5 w-1/3 rounded bg-foreground/85 mb-1" />
              <div className="h-px bg-foreground/30 mb-1.5" />
              <div className="h-1 w-full rounded bg-foreground/25 mb-1" />
              <div className="h-1 w-5/6 rounded bg-foreground/25 mb-2" />
              <div className="h-1.5 w-1/3 rounded bg-foreground/85 mb-1" />
              <div className="h-px bg-foreground/30 mb-1.5" />
              <div className="h-1 w-full rounded bg-foreground/25 mb-1" />
              <div className="h-1 w-4/5 rounded bg-foreground/25" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
