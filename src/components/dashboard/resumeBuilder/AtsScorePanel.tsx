import { computeAtsScore } from "@/lib/resumeBuilder/atsScore";
import type { ResumeDocument } from "@/lib/resumeBuilder/types";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export function AtsScorePanel({ doc }: { doc: ResumeDocument }) {
  const score = computeAtsScore(doc);
  const tone =
    score.total >= 85 ? "emerald" : score.total >= 70 ? "amber" : "rose";
  const toneRing =
    tone === "emerald"
      ? "ring-sky-500/30 from-sky-500/15"
      : tone === "amber"
        ? "ring-amber-500/30 from-amber-500/15"
        : "ring-rose-500/30 from-rose-500/15";
  const toneText =
    tone === "emerald"
      ? "text-sky-300"
      : tone === "amber"
        ? "text-amber-300"
        : "text-rose-300";

  const bars: { label: string; value: number }[] = [
    { label: "Layout", value: score.layoutReadability },
    { label: "Headings", value: score.sectionHeadingClarity },
    { label: "Keywords", value: score.keywordReadability },
    { label: "Export safety", value: score.exportSafety },
  ];

  return (
    <div
      className={`rounded-2xl ring-1 ring-inset ${toneRing} bg-gradient-to-br to-transparent p-4 space-y-3`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] text-foreground/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          ATS safety score
        </div>
        <div className={`text-[26px] font-semibold tabular-nums ${toneText}`}>
          {score.total}
          <span className="text-foreground/40 text-[12px] font-normal"> / 100</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex items-center justify-between text-[11px] text-foreground/65">
              <span>{b.label}</span>
              <span className="tabular-nums">{b.value}/25</span>
            </div>
            <div className="h-1 rounded-full bg-foreground/[0.07] overflow-hidden">
              <div
                className={
                  tone === "emerald"
                    ? "h-full bg-sky-400/70"
                    : tone === "amber"
                      ? "h-full bg-amber-400/70"
                      : "h-full bg-rose-400/70"
                }
                style={{ width: `${(b.value / 25) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {score.warnings.length > 0 && (
        <div className="pt-1 space-y-1.5">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-foreground/55 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-300" />
            Risk warnings
          </div>
          <ul className="space-y-1">
            {score.warnings.slice(0, 5).map((w, i) => (
              <li key={i} className="text-[11.5px] text-foreground/70 leading-snug">
                · {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
