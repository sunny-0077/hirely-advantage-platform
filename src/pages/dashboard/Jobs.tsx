import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useResumeSource } from "@/hooks/useResumeSource";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Briefcase, ExternalLink, Loader2, Mail, MessagesSquare, MapPin, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const CITY_HUBS = ["Bengaluru", "Hyderabad", "Pune", "Mumbai", "Delhi NCR", "Remote"] as const;

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
};

function TruthCardBadge({ t }: { t: TruthCard }) {
  const stack = (t.true_tech_stack ?? []).slice(0, 6);
  return (
    <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">3-second truth</span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Wallet className="size-3.5 text-primary" />{t.estimated_ctc_range || "CTC not disclosed"}
        </span>
      </div>
      {stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {stack.map((s) => <Badge key={s} variant="secondary" className="font-medium">{s}</Badge>)}
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
          {t.red_flags!.slice(0, 3).map((f) => <li key={f}>{f}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function Jobs() {
  const navigate = useNavigate();
  const savedResume = useResumeSource();
  const inFlight = useRef(false);
  const requestKeys = useRef(new Map<string, string>());
  const retryKey = (key: string) => { const id = requestKeys.current.get(key) ?? crypto.randomUUID(); requestKeys.current.set(key, id); return id; };
  const [city, setCity] = useState<string>("Bengaluru");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tailorJob, setTailorJob] = useState<Job | null>(null);
  const [resumes, setResumes] = useState<{ id: string; file_name: string }[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase.from("jobs_catalog").select("*").eq("city_hub", city).order("fetched_at", { ascending: false }).limit(60)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) toast.error("Couldn't load jobs");
        setJobs((data ?? []) as unknown as Job[]);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [city]);

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
    <div>
      <PageHeader eyebrow="Job feed" title="Fresh roles in your city" description="Real openings from tech companies hiring in India, each with an honest truth card." />

      {savedResume.data?.available && <p className="text-sm text-muted-foreground mb-4">Career facts source: {savedResume.data.label}</p>}
      <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="City">
        {CITY_HUBS.map((c) => (
          <Button key={c} size="sm" role="tab" aria-selected={city === c} variant={city === c ? "default" : "outline"}
            className="rounded-full" onClick={() => setCity(c)}>{c}</Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : jobs.length === 0 ? (
        <EmptyState icon={Briefcase} title={`No ${city} roles yet`} description="New jobs are added regularly. Try another city for now." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((j) => (
            <article key={j.id} className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col gap-4")}>
              <div>
                <h3 className="font-semibold text-foreground leading-snug">{j.title}</h3>
                <p className="text-sm text-muted-foreground">{j.company_name}</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" />{j.city_hub} · {j.work_mode ?? "On-site"}
                </p>
              </div>
              <TruthCardBadge t={j.truth_card_json ?? {}} />
              <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button size="lg" className="flex-1 font-semibold text-sm px-3 min-w-0" onClick={() => runTailor(j)} disabled={!!busyJobId || !!letterJobId || !!prepJobId}
                  aria-label={`Tailor Resume for ${j.title}`}>
                  {busyJobId === j.id ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {busyJobId === j.id ? "Tailoring…" : <span className="truncate">Tailor Resume<span className="hidden 2xl:inline"> · 1 credit</span></span>}
                </Button>
                <Button size="lg" variant="secondary" className="flex-1 font-semibold text-sm px-3 min-w-0" onClick={() => runCoverLetter(j)} disabled={!!busyJobId || !!letterJobId || !!prepJobId}
                  aria-label={`Generate Cover Letter for ${j.title}`}>
                  {letterJobId === j.id ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  {letterJobId === j.id ? "Writing…" : <span className="truncate">Cover Letter<span className="hidden 2xl:inline"> · 1 credit</span></span>}
                </Button>
                <Button size="lg" variant="secondary" className="flex-1 font-semibold text-sm px-3 min-w-0" onClick={() => runInterviewPrep(j)} disabled={!!busyJobId || !!letterJobId || !!prepJobId}
                  aria-label={`Interview Prep for ${j.title}`}>
                  {prepJobId === j.id ? <Loader2 className="size-4 animate-spin" /> : <MessagesSquare className="size-4" />}
                  {prepJobId === j.id ? "Preparing…" : <span className="truncate">Interview Prep<span className="hidden 2xl:inline"> · 1 credit</span></span>}
                </Button>
                <Button asChild size="lg" variant="outline" className="flex-1 text-sm px-3 min-w-0" disabled={!j.apply_url}>
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
