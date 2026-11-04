import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Briefcase, ExternalLink, Loader2, MapPin, Sparkles, Wallet } from "lucide-react";
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

  const openTailor = async (job: Job) => {
    setTailorJob(job);
    const { data } = await supabase.from("resumes").select("id, file_name").order("created_at", { ascending: false });
    setResumes(data ?? []);
    setResumeId(data?.[0]?.id ?? "");
  };

  const runTailor = async () => {
    if (!tailorJob || !resumeId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("tailor-resume", {
        body: { resume_id: resumeId, target_role: tailorJob.title, job_description: (tailorJob.raw_description ?? "").slice(0, 6000) },
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        const body = ctx && typeof ctx.json === "function" ? await ctx.json().catch(() => null) : null;
        throw new Error(body?.error || error.message);
      }
      if (data?.error) throw new Error(data.error);
      toast.success("Tailored resume ready. 1 credit used.");
      setTailorJob(null);
      navigate(`/app/resume?resume=${resumeId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tailoring failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Job feed" title="Fresh roles in your city" description="Real openings from tech companies hiring in India, each with an honest truth card." />

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
        <div className="grid gap-4 md:grid-cols-2">
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
              <div className="mt-auto flex gap-2">
                <Button asChild variant="outline" className="flex-1" disabled={!j.apply_url}>
                  <a href={j.apply_url ?? "#"} target="_blank" rel="noopener noreferrer">Apply Now<ExternalLink className="size-3.5" /></a>
                </Button>
                <Button className="flex-1" onClick={() => openTailor(j)}><Sparkles className="size-4" />Tailor Resume</Button>
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
          {resumes.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Upload a resume first.</p>
              <Button onClick={() => navigate("/app/resume")}>Upload resume</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Select value={resumeId} onValueChange={setResumeId}>
                <SelectTrigger><SelectValue placeholder="Choose a resume" /></SelectTrigger>
                <SelectContent>{resumes.map((r) => <SelectItem key={r.id} value={r.id}>{r.file_name}</SelectItem>)}</SelectContent>
              </Select>
              <Button className="w-full" onClick={runTailor} disabled={busy || !resumeId}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Tailor for 1 credit
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
