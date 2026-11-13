import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Briefcase, ExternalLink, Loader2, Mail, MessagesSquare, MapPin, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fetchPreferredJobs, useJobPreferences } from "@/hooks/useJobPreferences";
import { WORK_MODES } from "@/lib/jobPreferences";

type TruthCard = {
  true_tech_stack?: string[];
  estimated_ctc_range?: string;
  is_ghost_job?: boolean;
  is_corporate_fluff?: boolean;
  red_flags?: string[];
};
type Job = {
  id: string; title: string; company_name: string; city_hub: string; work_mode: string | null;
  apply_url: string | null; raw_description: string | null; truth_card_json: TruthCard; fetched_at: string;
  source?: string | null; source_url?: string | null;
};

function TruthCardBadge({ t }: { t: TruthCard }) {
  const stack = (t.true_tech_stack ?? []).slice(0, 6);
  return (
    <div className="rounded-md border-t border-border bg-background pt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">3-second truth</span>
        <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
          <Wallet className="size-3.5 text-primary" />{t.estimated_ctc_range || "Salary not disclosed"}
        </span>
      </div>
      {stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {stack.map((s) => <Badge key={s} variant="secondary" className="font-medium px-2 py-0">{s}</Badge>)}
        </div>
      )}
      {(t.is_ghost_job || t.is_corporate_fluff) && (
        <div className="flex flex-wrap gap-1.5">
          {t.is_ghost_job && <Badge variant="destructive" className="gap-1"><AlertTriangle className="size-3" />Possible ghost job</Badge>}
          {t.is_corporate_fluff && <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive"><AlertTriangle className="size-3" />Corporate fluff</Badge>}
        </div>
      )}
      {(t.red_flags ?? []).length > 0 && (
        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
          {(t.red_flags ?? []).slice(0, 3).map((f) => <li key={f}>{f}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function Jobs() {
  const navigate = useNavigate();
  const inFlight = useRef(false);
  const requestKeys = useRef(new Map<string, string>());
  const retryKey = (key: string) => { const id = requestKeys.current.get(key) ?? crypto.randomUUID(); requestKeys.current.set(key, id); return id; };
  const prefs = useJobPreferences();
  const [city, setCity] = useState<string>("all");
  const [modes, setModes] = useState<string[] | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tailorJob, setTailorJob] = useState<Job | null>(null);
  const [resumes, setResumes] = useState<{ id: string; file_name: string }[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [busy, setBusy] = useState(false);

  const myPlaces = prefs.data?.locations ?? [];
  const activeModes = modes ?? prefs.data?.modes ?? [];
  useEffect(() => {
    if (prefs.isPending) return;
    let alive = true;
    setLoading(true);
    fetchPreferredJobs(city === "all" ? myPlaces : [city], activeModes, prefs.data?.role ?? "")
      .then(data => { if (alive) setJobs(data as unknown as Job[]); })
      .catch(() => { if (alive) toast.error("Couldn't load jobs"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [city, prefs.isPending, prefs.data, activeModes.join("|")]);

  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  void setResumes; void setResumeId;

  const [letterJobId, setLetterJobId] = useState<string | null>(null);
  const runCoverLetter = async (job: Job) => {
    if (letterJobId || busyJobId) return;
    if (inFlight.current) return;
    inFlight.current = true;
    setLetterJobId(job.id);
    try {
      const { data, error } = await supabase.functions.invoke("job-cover-letter", { body: { job_id: job.id, request_id: retryKey(`letter:${job.id}`) } });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        const body = ctx && typeof ctx.json === "function" ? await ctx.json().catch(() => null) : null;
        throw new Error(body?.error || error.message);
      }
      if (data?.error) throw new Error(data.error);
      requestKeys.current.delete(`letter:${job.id}`);
      toast.success(data?.replayed ? "Previous letter recovered — no additional credit used." : "Cover letter ready. 1 credit used.");
      if(data?.resume_source?.label) toast.info(`Source: ${data.resume_source.label}${Object.keys(data.resume_source.omitted ?? {}).length ? `. Input limit omitted whole facts from: ${Object.entries(data.resume_source.omitted).map(([k,n])=>`${k} (${n})`).join(", ")}` : ""}.`);
      const id = data?.letter?.id;
      navigate(id ? `/app/documents?letter=${id}` : "/app/documents");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cover letter failed");
    } finally {
      inFlight.current = false;
      setLetterJobId(null);
    }
  };

  const [prepJobId, setPrepJobId] = useState<string | null>(null);
  const runInterviewPrep = async (job: Job) => {
    if (prepJobId || letterJobId || busyJobId) return;
    if (inFlight.current) return;
    inFlight.current = true;
    setPrepJobId(job.id);
    try {
      const { data, error } = await supabase.functions.invoke("job-interview-prep", { body: { job_id: job.id, request_id: retryKey(`prep:${job.id}`) } });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        const body = ctx && typeof ctx.json === "function" ? await ctx.json().catch(() => null) : null;
        throw new Error(body?.error || error.message);
      }
      if (data?.error) throw new Error(data.error);
      requestKeys.current.delete(`prep:${job.id}`);
      toast.success(data?.replayed ? "Previous guide recovered — no additional credit used." : "Interview prep guide ready. 1 credit used.");
      if(data?.resume_source?.label) toast.info(`Source: ${data.resume_source.label}${Object.keys(data.resume_source.omitted ?? {}).length ? `. Input limit omitted whole facts from: ${Object.entries(data.resume_source.omitted).map(([k,n])=>`${k} (${n})`).join(", ")}` : ""}.`);
      const id = data?.guide?.id;
      navigate(id ? `/app/documents?prep=${id}` : "/app/documents");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Interview prep failed");
    } finally {
      inFlight.current = false;
      setPrepJobId(null);
    }
  };

  const runTailor = async (job: Job | null = tailorJob) => {
    if (!job || busyJobId) return;
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setBusyJobId(job.id);
    try {
      const { data, error } = await supabase.functions.invoke("tailor-resume", {
        body: { job_id: job.id, target_role: job.title, request_id: retryKey(`tailor:${job.id}`) },
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        const body = ctx && typeof ctx.json === "function" ? await ctx.json().catch(() => null) : null;
        throw new Error(body?.error || error.message);
      }
      if (data?.error) throw new Error(data.error);
      requestKeys.current.delete(`tailor:${job.id}`);
      toast.success(data?.replayed ? "Previous resume recovered — no additional credit used." : "Tailored resume ready. 1 credit used.");
      setTailorJob(null);
      if(data?.resume_source?.label) toast.info(`Source: ${data.resume_source.label}${Object.keys(data.resume_source.omitted ?? {}).length ? `. Input limit omitted whole facts from: ${Object.entries(data.resume_source.omitted).map(([k,n])=>`${k} (${n})`).join(", ")}` : ""}.`);
      const id = data?.tailoring?.id;
      navigate(id ? `/app/documents?tailoring=${id}` : "/app/documents");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tailoring failed");
    } finally {
      inFlight.current = false;
      setBusy(false);
      setBusyJobId(null);
    }
  };

  return (
    <div className="jobs-page">
      <PageHeader className="mb-6" title={prefs.data?.role ? `${prefs.data.role} roles for you` : "Jobs for you"} />

      <div className="flex flex-wrap gap-2.5 mb-3" role="tablist" aria-label="Location">
        {["all", ...myPlaces].map((c) => (
          <Button key={c} size="sm" role="tab" aria-selected={city === c} variant={city === c ? "default" : "outline"}
            className="rounded-md h-8 px-3" onClick={() => setCity(c)}>{c === "all" ? "All my locations" : c}</Button>
        ))}
        <Button asChild size="sm" variant="link" className="h-8"><a href="/app/profile">Edit locations</a></Button>
      </div>
      <div className="flex flex-wrap gap-2 mb-8" aria-label="Work mode">
        {WORK_MODES.map(m => { const on = activeModes.includes(m); return (
          <Button key={m} size="sm" aria-pressed={on} variant={on ? "secondary" : "ghost"} className="rounded-full h-7 px-3"
            onClick={() => setModes(on ? activeModes.filter(x => x !== m) : [...activeModes, m])}>{m}</Button>); })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : jobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No matching roles yet" description="New openings are added regularly. Try another location or work mode." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((j) => (
            <article key={j.id} className={cn("rounded-lg border border-border bg-card p-6 flex flex-col gap-5")}>
              <div>
                <h3 className="font-semibold text-foreground leading-snug">{j.title}</h3>
                <p className="text-sm text-muted-foreground">{j.company_name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" />{j.city_hub} · {j.work_mode ?? "On-site"}
                </p>
                {j.source && j.source_url && <a href={j.source_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-muted-foreground underline">Source: {j.source}</a>}
              </div>
              <TruthCardBadge t={j.truth_card_json ?? {}} />
              <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <Button size="sm" className="h-9 md:h-8 flex-1 font-semibold text-sm px-2 min-w-0" onClick={() => runTailor(j)} disabled={!!busyJobId || !!letterJobId || !!prepJobId}
                  aria-label={`Tailor Resume for ${j.title}`}>
                  {busyJobId === j.id ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 xl:hidden" />}
                  {busyJobId === j.id ? "Tailoring…" : <span className="truncate">Tailor Resume<span className="hidden 2xl:inline"> · 1 credit</span></span>}
                </Button>
                <Button size="sm" variant="secondary" className="h-9 md:h-8 flex-1 font-semibold text-sm px-2 min-w-0" onClick={() => runCoverLetter(j)} disabled={!!busyJobId || !!letterJobId || !!prepJobId}
                  aria-label={`Generate Cover Letter for ${j.title}`}>
                  {letterJobId === j.id ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4 xl:hidden" />}
                  {letterJobId === j.id ? "Writing…" : <span className="truncate">Cover Letter<span className="hidden 2xl:inline"> · 1 credit</span></span>}
                </Button>
                <Button size="sm" variant="secondary" className="h-9 md:h-8 flex-1 font-semibold text-sm px-2 min-w-0" onClick={() => runInterviewPrep(j)} disabled={!!busyJobId || !!letterJobId || !!prepJobId}
                  aria-label={`Interview Prep for ${j.title}`}>
                  {prepJobId === j.id ? <Loader2 className="size-4 animate-spin" /> : <MessagesSquare className="size-4 xl:hidden" />}
                  {prepJobId === j.id ? "Preparing…" : <span className="truncate">Interview Prep<span className="hidden 2xl:inline"> · 1 credit</span></span>}
                </Button>
                <Button asChild size="sm" variant="outline" className="h-9 md:h-8 flex-1 text-sm px-2 min-w-0" disabled={!j.apply_url}>
                  <a href={j.apply_url ?? "#"} target="_blank" rel="noopener noreferrer">Apply Now<ExternalLink className="size-3.5" /></a>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={!!tailorJob} onOpenChange={(o) => !o && setTailorJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tailor your resume</DialogTitle>
            <DialogDescription>For {tailorJob?.title} at {tailorJob?.company_name}. This uses 1 credit, refunded if it fails.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={resumeId} onValueChange={setResumeId}>
              <SelectTrigger aria-label="Resume to tailor"><SelectValue placeholder="Choose a resume" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="master">Master resume (from My profile)</SelectItem>
                {resumes.map((r) => <SelectItem key={r.id} value={r.id}>{r.file_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={() => runTailor()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Tailor for 1 credit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
