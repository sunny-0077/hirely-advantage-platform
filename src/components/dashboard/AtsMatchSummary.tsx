import { CheckCircle2, AlertTriangle, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const asList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function AtsMatchSummary({ label, matched, missing }: { label?: string | null; matched?: unknown; missing?: unknown }) {
  const m = asList(matched);
  const g = asList(missing);
  if (!label && !m.length && !g.length) return null;
  return <section aria-label="ATS Match Summary" className="rounded-lg border border-border bg-muted/40 p-4 space-y-4">
    <div className="flex items-center gap-2"><Gauge className="size-4 text-primary" /><h3 className="text-sm font-semibold flex-1">ATS Match Summary</h3>{label && <Badge>{label}</Badge>}</div>
    {m.length > 0 && <div><p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" />Matched keywords ({m.length})</p>
      <div className="flex flex-wrap gap-1.5">{m.map(k => <span key={k} className="rounded-full border border-success/40 bg-success/10 text-success px-2.5 py-0.5 text-xs font-medium">{k}</span>)}</div></div>}
    {g.length > 0 && <div><p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><AlertTriangle className="size-3.5 text-warning" />Missing skills / gaps ({g.length})</p>
      <div className="flex flex-wrap gap-1.5">{g.map(k => <span key={k} className="rounded-full border border-warning/40 bg-warning/10 text-warning px-2.5 py-0.5 text-xs font-medium">{k}</span>)}</div>
      <p className="text-xs text-muted-foreground mt-2">These weren't in your master resume. Only add them if you genuinely have the experience.</p></div>}
  </section>;
}
