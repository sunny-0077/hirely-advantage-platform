import { useMemo } from "react";
import { AlertTriangle, Eye, Cpu, CheckCircle2 } from "lucide-react";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { cn } from "@/lib/utils";

type Compat = { tier: "Good" | "Fair" | "Poor"; score: number | null };

function extractScore(md: string): Compat {
  // Look for "ATS Readability Score: X/100" or "Overall: X/100"
  const m =
    /ATS\s+Readability\s+Score\s*[:\-]\s*(\d{1,3})\s*\/\s*100/i.exec(md) ??
    /Overall\s*[:\-]\s*(\d{1,3})\s*\/\s*100/i.exec(md);
  const score = m ? Math.min(100, Math.max(0, parseInt(m[1], 10))) : null;
  if (score == null) return { tier: "Fair", score: null };
  return { tier: score >= 80 ? "Good" : score >= 55 ? "Fair" : "Poor", score };
}

const TIER_STYLES: Record<Compat["tier"], { pill: string; ring: string; label: string }> = {
  Good: {
    pill: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/25",
    ring: "text-emerald-500",
    label: "Parses cleanly on most ATS engines.",
  },
  Fair: {
    pill: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/25",
    ring: "text-amber-500",
    label: "Some sections may misread. Worth fixing before you apply.",
  },
  Poor: {
    pill: "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/25",
    ring: "text-rose-500",
    label: "Major fields likely to drop or garble on submission.",
  },
};

// Detect problematic elements from the parse failure section
type Warning = { label: string; matcher: RegExp };
const WARNING_RULES: Warning[] = [
  { label: "Table not parsed", matcher: /table/i },
  { label: "Multi-column dropped", matcher: /column|two.?column|multi.?column/i },
  { label: "Image / graphic ignored", matcher: /image|graphic|logo|icon|photo/i },
  { label: "Text in header ignored", matcher: /header/i },
  { label: "Footer text ignored", matcher: /footer/i },
  { label: "Text box skipped", matcher: /text ?box/i },
  { label: "Non-standard heading", matcher: /non.?standard heading|unusual heading|custom heading/i },
];

function detectWarnings(md: string): string[] {
  // Slice the "Parse Failure Report" section if present
  const m = /##[^\n]*Parse Failure Report[\s\S]*?(?=\n##\s|$)/i.exec(md);
  const scope = m ? m[0] : md;
  const found = new Set<string>();
  for (const r of WARNING_RULES) if (r.matcher.test(scope)) found.add(r.label);
  return [...found];
}

// Simulate what the ATS "sees" — strip decoration, collapse spacing,
// uppercase heading-like short lines, drop obvious pipes/bullets.
function stripForAts(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const raw of lines) {
    let l = raw
      .replace(/[•●◦▪■□▶►✔✓✗★☆◆♦→⇒–—]+/g, "-")
      .replace(/\t+/g, "    ")
      .replace(/[|]{2,}/g, " ")
      .replace(/\s+\|\s+/g, "  ")
      .replace(/[ \t]{2,}/g, " ")
      .trimEnd();
    // Drop lines that look like decoration only
    if (/^[-_=~*.·•\s]+$/.test(l)) continue;
    out.push(l);
  }
  // Collapse >1 blank lines
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export default function ParseCompareView({
  originalText,
  markdown,
}: {
  originalText: string;
  markdown: string;
}) {
  const compat = useMemo(() => extractScore(markdown), [markdown]);
  const warnings = useMemo(() => detectWarnings(markdown), [markdown]);
  const atsText = useMemo(() => stripForAts(originalText), [originalText]);
  const tier = TIER_STYLES[compat.tier];

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <SectionCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <p className="text-[10.5px] tracking-[0.22em] uppercase text-foreground/50 font-semibold">
                Parse compatibility
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "text-[12px] font-semibold tracking-[0.14em] uppercase px-2.5 py-1 rounded-full",
                    tier.pill,
                  )}
                >
                  {compat.tier}
                </span>
                <span className="text-[13px] text-foreground/70">{tier.label}</span>
              </div>
            </div>
          </div>
          {warnings.length > 0 && (
            <div className="flex items-center gap-2 text-[12px] text-foreground/60">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              {warnings.length} parse warning{warnings.length === 1 ? "" : "s"} flagged
            </div>
          )}
        </div>
      </SectionCard>

      {/* Side-by-side */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Human view */}
        <SectionCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-foreground/[0.06] bg-foreground/[0.015]">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-foreground/60" />
              <span className="text-[11px] tracking-[0.18em] uppercase font-semibold text-foreground/70">
                What you see
              </span>
            </div>
            <span className="text-[10.5px] text-foreground/45">Original resume</span>
          </div>
          <div className="p-5 sm:p-6 max-h-[560px] overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-[1.7] text-foreground/85">
              {originalText}
            </pre>
          </div>
        </SectionCard>

        {/* ATS view */}
        <SectionCard className="p-0 overflow-hidden bg-[hsl(var(--foreground)/0.025)]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-foreground/[0.06] bg-foreground/[0.04]">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-foreground/60" />
              <span className="text-[11px] tracking-[0.18em] uppercase font-semibold text-foreground/70">
                What the ATS sees
              </span>
            </div>
            <span className="text-[10.5px] text-foreground/45">Machine view · stripped</span>
          </div>

          {warnings.length > 0 && (
            <div className="px-5 pt-4 flex flex-wrap gap-1.5">
              {warnings.map((w) => (
                <span
                  key={w}
                  className="inline-flex items-center gap-1 text-[10.5px] font-medium tracking-[0.06em] px-2 py-1 rounded-full bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/25"
                >
                  <AlertTriangle className="w-3 h-3" />
                  {w}
                </span>
              ))}
            </div>
          )}
          {warnings.length === 0 && (
            <div className="px-5 pt-4">
              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium tracking-[0.06em] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/25">
                <CheckCircle2 className="w-3 h-3" />
                No structural warnings detected
              </span>
            </div>
          )}

          <div className="p-5 sm:p-6 max-h-[520px] overflow-y-auto">
            <pre
              className="whitespace-pre-wrap text-[12.5px] leading-[1.7] text-foreground/80"
              style={{ fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace' }}
            >
              {atsText}
            </pre>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
