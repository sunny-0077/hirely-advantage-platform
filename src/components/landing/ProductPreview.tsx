import { useState } from "react";
import { ArrowRight, Check, FileText, Mail, MessageSquare, ChevronRight, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "./Logo";

const views = ["Tailored resume", "Cover letter", "Interview prep"] as const;
export function ProductPreview() {
  const [view, setView] = useState<(typeof views)[number]>("Tailored resume");
  return <div className="product-shadow overflow-hidden rounded-lg border border-border bg-card text-left" aria-label="Illustrative Hirely product preview">
    <div className="flex items-center justify-between border-b border-border px-5 py-3"><div className="flex items-center gap-3"><PanelLeft className="size-4 text-muted-foreground" /><span className="text-xs font-medium">My workspace</span><ChevronRight className="size-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">Custom Job Studio</span></div><span className="text-[10px] text-muted-foreground">Illustrative example</span></div>
    <div className="flex">
      <aside className="hidden w-48 shrink-0 border-r border-border bg-background/60 p-5 md:block"><LogoLockup size="text-lg" /><div className="mt-8 space-y-4 text-xs text-muted-foreground"><p>My workspace</p><p>Master Resume</p><p>Jobs</p><p className="rounded-md bg-accent px-3 py-2 font-semibold text-primary">My documents</p><p>Applications</p></div><div className="mt-20 border-t border-border pt-4 text-[11px] text-muted-foreground">One career. One workspace.</div></aside>
      <div className="min-w-0 flex-1 p-5 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] text-muted-foreground">APPLICATION KIT</p><h3 className="mt-1 text-lg font-semibold">Data Analyst</h3><p className="text-xs text-muted-foreground">Example company · Bengaluru · Hybrid</p></div><span className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-primary">Source: Master Resume</span></div>
        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-border pb-3">{views.map((v, i) => { const Icon = [FileText, Mail, MessageSquare][i]; return <Button key={v} size="sm" variant={view === v ? "secondary" : "ghost"} onClick={() => setView(v)} className={view === v ? "text-primary bg-accent" : "text-muted-foreground"}><Icon />{v}</Button>; })}</div>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_220px]">
          <div className="min-h-48">
            {view === "Tailored resume" ? <><p className="text-xs font-semibold">PROFESSIONAL SUMMARY</p><p className="mt-3 text-sm leading-7 text-muted-foreground">Data analyst experienced in SQL reporting, Python analysis and dashboard development. Translates business questions into clear, actionable findings.</p><p className="mt-5 text-xs font-semibold">RELEVANT EXPERIENCE</p><div className="mt-3 flex gap-2 text-sm leading-6 text-muted-foreground"><span>•</span><p>Built SQL reports and dashboards to help the operations team monitor performance.</p></div></> : view === "Cover letter" ? <><p className="text-sm font-medium">Dear Hiring Team,</p><p className="mt-4 text-sm leading-7 text-muted-foreground">I am applying for the Data Analyst role. My experience with SQL reporting, Python analysis and dashboard development aligns with the job description.</p><p className="mt-4 text-sm leading-7 text-muted-foreground">I would welcome the opportunity to discuss how I can contribute to your team.</p></> : <><p className="text-sm font-semibold">How would you investigate a change in a business metric?</p><p className="mt-3 text-sm leading-7 text-muted-foreground">Clarify the metric, check the data, segment the results and explain your findings. Use a real example from your experience where available.</p><p className="mt-5 text-xs font-medium text-primary">Question for the hiring manager</p><p className="mt-2 text-sm text-muted-foreground">What decisions will this role’s analysis support?</p></>}
          </div>
          <div className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><p className="text-xs font-semibold">Job requirements</p><p className="mt-4 text-[11px] text-muted-foreground">ALIGNED SKILLS</p><div className="mt-2 flex flex-wrap gap-1.5">{["SQL", "Python", "Dashboards"].map(k => <span key={k} className="rounded border border-border px-2 py-1 text-[11px]">{k}</span>)}</div><p className="mt-5 text-[11px] text-muted-foreground">TO REVIEW</p><p className="mt-2 text-xs leading-6">The role mentions Tableau. Add it only if it reflects your experience.</p><div className="mt-4 flex items-center gap-2 text-[11px] text-primary"><Check className="size-3" />Facts, not fabricated achievements</div></div>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-[11px] text-muted-foreground"><span>Example content · not a customer result</span><span className="flex items-center gap-1">Review before applying <ArrowRight className="size-3" /></span></div>
      </div>
    </div>
  </div>;
}
