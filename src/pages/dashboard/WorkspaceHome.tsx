import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Briefcase, CalendarClock, Coins, Download, Eye, FileStack, Loader2, Mail, MessagesSquare, Sparkles, Wand2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { exportLetterPdf, exportTailoredPdf } from "@/lib/tailoredResume/export";

const JD_MAX = 4000;
const PLAN_LABEL: Record<string, string> = { scout_free: "Scout (free)", starter_pack: "Starter Pack", pass_90_day: "90-Day Pass" };

type Doc = { id: string; kind: "tailoring" | "letter" | "prep"; title: string; text: string; created_at: string };
type Action = "tailor" | "letter" | "prep";

async function errorMessage(error: unknown, data: unknown) {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try { const b = await ctx.json(); if (b?.error) return b.error as string; } catch { /* ignore */ }
  }
  return (data as { error?: string })?.error ?? "Something went wrong. Any credit used was refunded — please try again.";
}

export default function WorkspaceHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState<Action | null>(null);

  const q = useQuery({
    queryKey: ["workspace-home", user?.id], enabled: Boolean(user),
    queryFn: async () => {
      const uid = user!.id;
      const { data: profile } = await supabase.from("profiles").select("plan_tier,pass_expires_at,credits_balance,master_resume_text,city_hub").eq("user_id", uid).maybeSingle();
      const [t, l, p, tc, lc, pc, jobs] = await Promise.all([
        supabase.from("resume_tailorings").select("id,target_role,tailored_text,created_at").eq("user_id", uid).not("tailored_text", "is", null).order("created_at", { ascending: false }).limit(3),
        supabase.from("cover_letters").select("id,company,role,full_letter,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(3),
        supabase.from("interview_prep_guides").select("id,company,role,guide_text,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(3),
        supabase.from("resume_tailorings").select("id", { count: "exact", head: true }).eq("user_id", uid).not("tailored_text", "is", null),
        supabase.from("cover_letters").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("interview_prep_guides").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("jobs_catalog").select("id,title,company_name,city_hub,work_mode").eq("city_hub", profile?.city_hub ?? "Bengaluru").order("fetched_at", { ascending: false }).limit(4),
      ]);
      const docs: Doc[] = [
        ...(t.data ?? []).map(d => ({ id: d.id, kind: "tailoring" as const, title: d.target_role, text: d.tailored_text ?? "", created_at: d.created_at })),
        ...(l.data ?? []).map(d => ({ id: d.id, kind: "letter" as const, title: `${d.role} · ${d.company}`, text: d.full_letter, created_at: d.created_at })),
        ...(p.data ?? []).map(d => ({ id: d.id, kind: "prep" as const, title: `${d.role}${d.company ? ` · ${d.company}` : ""}`, text: d.guide_text, created_at: d.created_at })),
      ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3);
      return { profile, docs, total: (tc.count ?? 0) + (lc.count ?? 0) + (pc.count ?? 0), jobs: jobs.data ?? [] };
    },
  });

  const profile = q.data?.profile;
  const resumeEmpty = q.isSuccess && (profile?.master_resume_text ?? "").trim().length < 80;
  const ready = title.trim().length >= 2 && company.trim().length >= 1 && jd.trim().length >= 50;

  async function run(action: Action) {
    if (!ready) { toast.error("Add a job title, company and job description (at least 50 characters)."); return; }
    if (resumeEmpty) { toast.error("Add your master resume on My profile first."); return; }
    setBusy(action);
    try {
      const custom = { title: title.trim(), company: company.trim(), description: jd.slice(0, JD_MAX) };
      const fn = action === "tailor" ? "tailor-resume" : action === "letter" ? "job-cover-letter" : "job-interview-prep";
      const body = action === "tailor" ? { target_role: `${custom.title} at ${custom.company}`, job_description: custom.description } : { custom };
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error || data?.error) { toast.error(await errorMessage(error, data)); return; }
      const id = action === "tailor" ? data?.tailoring?.id ?? data?.id : action === "letter" ? data?.letter?.id : data?.guide?.id;
      const param = action === "tailor" ? "tailoring" : action === "letter" ? "letter" : "prep";
      toast.success("Done — 1 credit used.");
      navigate(id ? `/app/documents?${param}=${id}` : "/app/documents");
    } finally { setBusy(null); }
  }

  const docLink = (d: Doc) => `/app/documents?${d.kind}=${d.id}`;
  const docPdf = (d: Doc) => d.kind === "letter" ? exportLetterPdf(d.title, d.text) : exportTailoredPdf(d.kind === "prep" ? `Interview prep ${d.title}` : d.title, d.text);
  const DocIcon = { tailoring: Sparkles, letter: Mail, prep: MessagesSquare };
  const kindLabel = { tailoring: "Tailored resume", letter: "Cover letter", prep: "Interview prep" };
  const fmt = (s: string) => new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  return <div className="max-w-6xl mx-auto">
    <PageHeader eyebrow="My workspace" title="Your next opportunity starts here." />

    {q.error && <p role="alert" className="text-destructive mb-5">Couldn't load your workspace. <Button variant="link" onClick={() => q.refetch()}>Retry</Button></p>}

    <section aria-label="Overview" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
      <Stat icon={Coins} label="Credits left" value={q.isPending ? "—" : String(profile?.credits_balance ?? 0)} />
      <Stat icon={CalendarClock} label={PLAN_LABEL[profile?.plan_tier ?? "scout_free"] ?? "Plan"} value={q.isPending ? "—" : profile?.pass_expires_at ? `Until ${fmt(profile.pass_expires_at)}` : "No expiry"} />
      <Stat icon={FileStack} label="Documents generated" value={q.isPending ? "—" : String(q.data?.total ?? 0)} />
    </section>
    {resumeEmpty && <div role="alert" className="mb-8 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
      <AlertTriangle className="size-5 text-destructive" />
      <p className="flex-1 font-medium">Your master resume is empty. Add it so we can tailor resumes, letters and prep for you.</p>
      <Button asChild size="sm"><Link to="/app/profile">Add master resume<ArrowRight /></Link></Button>
    </div>}

    <section aria-labelledby="studio" className="bg-card border border-border rounded-lg p-6 mb-8 mt-4">
      <div className="flex items-center gap-2 mb-1"><Wand2 className="size-5 text-primary" /><h2 id="studio" className="text-xl font-semibold">Custom Job Studio</h2></div>
      <p className="text-sm text-muted-foreground mb-5">Found a job somewhere else? Paste it here and we'll use your master resume.</p>
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="space-y-1.5"><Label htmlFor="cjs-title">Job title</Label><Input id="cjs-title" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Data Analyst" /></div>
        <div className="space-y-1.5"><Label htmlFor="cjs-company">Company name</Label><Input id="cjs-company" maxLength={200} value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Swiggy" /></div>
      </div>
      <div className="space-y-1.5 mb-5">
        <div className="flex justify-between"><Label htmlFor="cjs-jd">Job description</Label><span className={`text-xs ${jd.length >= JD_MAX ? "text-destructive" : "text-muted-foreground"}`}>{jd.length.toLocaleString()} / {JD_MAX.toLocaleString()}</span></div>
        <Textarea id="cjs-jd" rows={8} maxLength={JD_MAX} value={jd} onChange={e => setJd(e.target.value.slice(0, JD_MAX))} placeholder="Paste the full job description…" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={!!busy} onClick={() => run("tailor")}>{busy === "tailor" ? <Loader2 className="animate-spin" /> : <Sparkles />}Tailor Resume (1 credit)</Button>
        <Button disabled={!!busy} variant="secondary" onClick={() => run("letter")}>{busy === "letter" ? <Loader2 className="animate-spin" /> : <Mail />}Cover Letter (1 credit)</Button>
        <Button disabled={!!busy} variant="secondary" onClick={() => run("prep")}>{busy === "prep" ? <Loader2 className="animate-spin" /> : <MessagesSquare />}Interview Prep (1 credit)</Button>
      </div>
      <p className="text-xs text-muted-foreground mt-3">If anything fails, your credit is refunded automatically.</p>
    </section>

    <div className="grid lg:grid-cols-2 gap-6">
      <section aria-labelledby="recent" className="bg-card border border-border rounded-lg p-5">
        <div className="flex justify-between items-center mb-3"><h2 id="recent" className="text-lg font-semibold">Recent documents</h2><Button asChild variant="link" className="px-0"><Link to="/app/documents">All documents<ArrowRight /></Link></Button></div>
        {q.isPending ? <p role="status" className="py-6 text-sm">Loading…</p> : q.data?.docs.length ? <ul className="divide-y divide-border">{q.data.docs.map(d => { const I = DocIcon[d.kind]; return <li key={`${d.kind}-${d.id}`} className="flex items-center gap-3 py-3">
          <I className="size-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0"><p className="text-sm font-medium break-words">{d.title}</p><p className="text-xs text-muted-foreground">{kindLabel[d.kind]} · {fmt(d.created_at)}</p></div>
          <Button asChild size="sm" variant="outline"><Link to={docLink(d)}><Eye />View</Link></Button>
          <Button size="sm" onClick={() => docPdf(d)}><Download />PDF</Button>
        </li>; })}</ul> : <p className="py-6 text-sm text-muted-foreground">Nothing yet — use the studio above or tap a job in the feed.</p>}
      </section>

      <section aria-labelledby="jobs" className="bg-card border border-border rounded-lg p-5">
        <div className="flex justify-between items-center mb-3"><h2 id="jobs" className="text-lg font-semibold">Fresh jobs in {profile?.city_hub ?? "Bengaluru"}</h2><Button asChild variant="link" className="px-0"><Link to="/app/jobs">Job feed<ArrowRight /></Link></Button></div>
        {q.isPending ? <p role="status" className="py-6 text-sm">Loading…</p> : q.data?.jobs.length ? <ul className="divide-y divide-border">{q.data.jobs.map(j => <li key={j.id}><Link to="/app/jobs" className="flex items-center gap-3 py-3"><Briefcase className="size-4 text-muted-foreground shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm font-medium break-words">{j.title}</p><p className="text-xs text-muted-foreground">{j.company_name}</p></div>{j.work_mode && <Badge variant="secondary">{j.work_mode}</Badge>}</Link></li>)}</ul> : <p className="py-6 text-sm text-muted-foreground">No jobs in your city yet.</p>}
      </section>
    </div>
  </div>;
}

function Stat({ icon: I, label, value }: { icon: typeof Coins; label: string; value: string }) {
  return <div className="bg-card border border-border rounded-lg p-5"><I className="size-5 text-muted-foreground mb-3" /><p className="text-2xl font-semibold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>;
}
