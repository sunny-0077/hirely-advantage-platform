import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useResumeSource } from "@/hooks/useResumeSource";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobFeedCard, type Job } from "@/components/dashboard/JobFeedCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";

export const CITY_HUBS = ["Bengaluru", "Hyderabad", "Pune", "Mumbai", "Delhi NCR", "Remote"] as const;

export default function Jobs() {
  const navigate = useNavigate();
  const savedResume = useResumeSource();
  const inFlight = useRef(false);
  const requestKeys = useRef(new Map<string, string>());
  const retryKey = (key: string) => { const id = requestKeys.current.get(key) ?? crypto.randomUUID(); requestKeys.current.set(key, id); return id; };
  const [city, setCity] = useState<string>("Bengaluru");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [workMode, setWorkMode] = useState("all");
  const [loadError, setLoadError] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(false);
    supabase.from("jobs_catalog").select("*").eq("city_hub", city).order("fetched_at", { ascending: false }).limit(60)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) { setLoadError(true); toast.error("Couldn't load jobs"); }
        setJobs((data ?? []) as unknown as Job[]);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [city, refresh]);

  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [letterJobId, setLetterJobId] = useState<string | null>(null);
  const [prepJobId, setPrepJobId] = useState<string | null>(null);

  const runCoverLetter = async (job: Job) => {
    if (letterJobId || busyJobId || inFlight.current) return;
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

  const runInterviewPrep = async (job: Job) => {
    if (prepJobId || letterJobId || busyJobId || inFlight.current) return;
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

  const runTailor = async (job: Job) => {
    if (busyJobId || inFlight.current) return;
    inFlight.current = true;
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
      if(data?.resume_source?.label) toast.info(`Source: ${data.resume_source.label}${Object.keys(data.resume_source.omitted ?? {}).length ? `. Input limit omitted whole facts from: ${Object.entries(data.resume_source.omitted).map(([k,n])=>`${k} (${n})`).join(", ")}` : ""}.`);
      const id = data?.tailoring?.id;
      navigate(id ? `/app/documents?tailoring=${id}` : "/app/documents");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tailoring failed");
    } finally {
      inFlight.current = false;
      setBusyJobId(null);
    }
  };

  const query = search.trim().toLowerCase();
  const visibleJobs = jobs.filter((job) => {
    const matchesQuery = !query || [job.title, job.company_name, ...(job.truth_card_json?.true_tech_stack ?? [])].some((value) => value.toLowerCase().includes(query));
    const mode = (job.work_mode ?? "").toLowerCase().replace(/[-\s]/g, "");
    return matchesQuery && (workMode === "all" || mode === workMode);
  });

  return (
    <div className="space-y-6 [letter-spacing:0]">
      <PageHeader eyebrow="Your next chapter" title="Jobs" description="Open roles. Clearer insights. Your next move." className="mb-0" />
      <div className="space-y-4 border-b border-border pb-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3 size-4 text-muted-foreground" />
            <Input aria-label="Search jobs" placeholder="Search roles, companies or skills" value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-lg bg-card pl-10 pr-10 focus-visible:ring-jobs-accent" />
            {search && <Button variant="ghost" size="icon" className="absolute right-1 top-1 size-8" aria-label="Clear search" onClick={() => setSearch("")}><X /></Button>}
          </div>
          <Select value={workMode} onValueChange={setWorkMode}>
            <SelectTrigger aria-label="Work mode" className="w-full gap-2 rounded-lg bg-card sm:w-44"><SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All work modes</SelectItem><SelectItem value="remote">Remote</SelectItem><SelectItem value="onsite">On-site</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="City">
          {CITY_HUBS.map((hub) => <Button key={hub} size="sm" role="tab" aria-selected={city === hub} variant={city === hub ? "jobs" : "outline"} className="shrink-0 rounded-full" onClick={() => setCity(hub)}>{hub}</Button>)}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p className="text-sm"><span className="font-semibold text-foreground">{loading ? "Finding roles…" : `${visibleJobs.length} ${visibleJobs.length === 1 ? "role" : "roles"}`}</span> in {city}</p>
        <p>{savedResume.data?.available ? `Career facts: ${savedResume.data.label}` : "Company career feeds"} · Newest imports first</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16" role="status" aria-label="Loading jobs"><Loader2 className="size-6 animate-spin text-jobs-accent" /></div>
      ) : loadError ? (
        <div className="py-12 text-center"><p className="mb-4 text-muted-foreground">Jobs couldn't be loaded. Please try again.</p><Button variant="outline" onClick={() => setRefresh((value) => value + 1)}>Try again</Button></div>
      ) : visibleJobs.length === 0 ? (
        <div><EmptyState icon={Briefcase} title={jobs.length ? "No matching roles" : `No ${city} roles yet`} description={jobs.length ? "Try a different search or work mode." : "New jobs are added regularly. Try another city for now."} />
          {(search || workMode !== "all") && <div className="text-center"><Button variant="outline" onClick={() => { setSearch(""); setWorkMode("all"); }}>Clear filters</Button></div>}
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleJobs.map((job) => <JobFeedCard key={job.id} job={job} disabled={!!busyJobId || !!letterJobId || !!prepJobId}
            busyAction={busyJobId === job.id ? "tailor" : letterJobId === job.id ? "letter" : prepJobId === job.id ? "prep" : null}
            onTailor={() => runTailor(job)} onLetter={() => runCoverLetter(job)} onPrep={() => runInterviewPrep(job)} />)}
        </div>
      )}
    </div>
  );
}
