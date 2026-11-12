import { useState } from "react";
import { ArrowUpRight, Briefcase, Check, ChevronRight, FileText, FolderOpen, LayoutDashboard, ListChecks, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "./Logo";
import { cn } from "@/lib/utils";

const views = ["Tailored resume", "Cover letter", "Interview prep"] as const;

/** Illustrative product view, isolated from account data and paid actions. */
export function CareerPreview() {
  const [view, setView] = useState<(typeof views)[number]>("Tailored resume");
  return <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-card shadow-product text-left">
    <div className="flex items-center justify-between border-b border-border px-5 py-3">
      <LogoLockup size="text-lg" />
      <span className="text-[11px] font-medium text-muted-foreground">Illustrative product example</span>
    </div>
    <div className="grid md:grid-cols-[180px_1fr]">
      <aside className="hidden md:block border-r border-border bg-background/60 p-4">
        <p className="mb-3 px-2 text-[10px] font-semibold uppercase text-muted-foreground">Workspace</p>
        {[[LayoutDashboard, "Dashboard"], [FileText, "Master Resume"], [Briefcase, "Jobs"], [FolderOpen, "My documents"], [ListChecks, "Applications"]].map(([Icon, label]) => {
          const I = Icon as typeof FileText;
          return <div key={String(label)} className={cn("flex items-center gap-2.5 rounded-md px-2 py-2.5 text-xs", label === "My documents" ? "bg-accent text-primary font-semibold" : "text-muted-foreground")}><I className="size-3.5" />{String(label)}</div>;
        })}
        <div className="mt-14 border-t border-border pt-4 px-2 text-xs text-muted-foreground">Your career. In one place.</div>
      </aside>
      <div className="min-w-0 p-5 md:p-7">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div><p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Application workspace</p><h3 className="text-lg font-semibold">Data Analyst <span className="font-normal text-muted-foreground">/ Example Co.</span></h3></div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">Preparing<ChevronRight className="size-3" /></span>
        </div>
        <div className="flex flex-wrap gap-x-1 gap-y-2 border-b border-border mb-5" role="tablist" aria-label="Example document">
          {views.map(v => <Button key={v} role="tab" aria-selected={view === v} variant="ghost" size="sm" onClick={() => setView(v)} className={cn("rounded-none border-b-2 text-xs px-3", view === v ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>{v}</Button>)}
        </div>
        <div className="grid sm:grid-cols-[1fr_190px] gap-6">
          <div className="min-h-[218px]" role="tabpanel">
            {view === "Tailored resume" ? <>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-3">Experience · tailored to the role</p>
              <h4 className="font-semibold text-sm mb-1">Data Analyst</h4><p className="text-xs text-muted-foreground mb-4">Example experience · illustrative only</p>
              <ul className="space-y-3 text-[13px] leading-relaxed"><li>Analyzed operational data with Python and SQL to support weekly reporting.</li><li>Built dashboards to make recurring business trends easier for stakeholders to review.</li></ul>
              <p className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-primary"><Check className="size-3" />Grounded in saved career information</p>
            </> : view === "Cover letter" ? <><Mail className="size-4 text-muted-foreground mb-4" /><p className="text-sm font-semibold mb-3">Dear hiring team,</p><p className="text-[13px] leading-relaxed">I’m interested in the Data Analyst role at Example Co. My experience with Python, SQL and operational reporting aligns with the analytical work described in your job posting.</p><p className="text-xs text-muted-foreground mt-5">Illustrative excerpt, not a customer document.</p></> : <><MessageSquare className="size-4 text-muted-foreground mb-4" /><h4 className="text-sm font-semibold mb-3">How would you explain a complex finding?</h4><p className="text-[13px] leading-relaxed">Start with the business question, describe your analysis, then connect the finding to a decision. Use a real example from your experience.</p><p className="text-xs text-muted-foreground mt-5">Answer structure · not an invented achievement</p></>}
          </div>
          <div className="border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-5">
            <p className="text-xs font-semibold mb-4">Job requirements</p>
            <p className="text-[11px] text-muted-foreground mb-2">Relevant skills in this example</p>
            <div className="flex flex-wrap gap-1.5">{["Python", "SQL", "Reporting"].map(s => <span key={s} className="text-[11px] rounded px-2 py-1 bg-accent text-primary">{s}</span>)}</div>
            <div className="mt-5 pt-4 border-t border-border"><p className="text-xs font-medium mb-2">Worth reviewing</p><p className="text-[11px] leading-relaxed text-muted-foreground">Check whether your experience demonstrates stakeholder communication.</p></div>
            <a href="#features" className="mt-5 inline-flex gap-1 items-center text-xs font-medium text-primary">Explore Hirely<ArrowUpRight className="size-3" /></a>
          </div>
        </div>
      </div>
    </div>
  </div>;
}