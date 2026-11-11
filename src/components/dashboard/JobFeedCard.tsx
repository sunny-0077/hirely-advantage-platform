import { AlertTriangle, ArrowUpRight, Building2, Check, Clock3, Loader2, Mail, MapPin, MessagesSquare, Sparkles, Wallet } from "lucide-react";
import { formatDistanceToNowStrict, isValid } from "date-fns";
import { Button } from "@/components/ui/button";

export type TruthCard = {
  true_tech_stack?: string[];
  estimated_ctc_range?: string;
  is_ghost_job?: boolean;
  is_corporate_fluff?: boolean;
  red_flags?: string[];
};
export type Job = {
  id: string; title: string; company_name: string; city_hub: string; work_mode: string | null;
  apply_url: string | null; raw_description: string | null; truth_card_json: TruthCard; fetched_at: string;
};

type Props = {
  job: Job;
  disabled: boolean;
  busyAction: "tailor" | "letter" | "prep" | null;
  onTailor: () => void;
  onLetter: () => void;
  onPrep: () => void;
};

export function JobFeedCard({ job, disabled, busyAction, onTailor, onLetter, onPrep }: Props) {
  const truth = job.truth_card_json ?? {};
  const stack = (truth.true_tech_stack ?? []).slice(0, 6);
  const fetched = new Date(job.fetched_at);
  const age = isValid(fetched) ? formatDistanceToNowStrict(fetched, { addSuffix: true }) : null;
  const warnings = [truth.is_ghost_job && "Possible ghost job", truth.is_corporate_fluff && "Corporate fluff", ...(truth.red_flags ?? []).slice(0, 2)].filter(Boolean);

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-job)] transition-shadow motion-reduce:transition-none lg:grid lg:grid-cols-[minmax(0,1fr)_240px]">
      <div className="min-w-0 p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <div aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-jobs-accent/15 bg-jobs-soft text-lg font-semibold text-jobs-accent">{job.company_name.trim().slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{job.company_name}</p>
            <h2 className="mt-1 break-words text-lg font-semibold leading-snug text-foreground sm:text-xl">{job.title}</h2>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 shrink-0" />{job.city_hub}</span>
          <span className="inline-flex items-center gap-1.5"><Building2 className="size-4 shrink-0" />{job.work_mode || "Mode not listed"}</span>
          {age && <span className="inline-flex items-center gap-1.5 text-xs"><Clock3 className="size-3.5 shrink-0" />Imported {age}</span>}
        </div>

        {stack.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{stack.map((skill) => <span key={skill} className="rounded-md border border-border bg-secondary/60 px-2.5 py-1 text-xs font-medium text-foreground">{skill}</span>)}</div>}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          <Button variant="jobs" className="flex-1 sm:flex-none" onClick={onTailor} disabled={disabled} aria-label={`Tailor Resume for ${job.title}`}>
            {busyAction === "tailor" ? <Loader2 className="animate-spin" /> : <Sparkles />}{busyAction === "tailor" ? "Tailoring…" : "Tailor Resume · 1 credit"}
          </Button>
          {job.apply_url ? <Button asChild variant="outline" className="flex-1 sm:flex-none"><a href={job.apply_url} target="_blank" rel="noopener noreferrer">Apply Now<ArrowUpRight /></a></Button> : <Button variant="outline" disabled>Apply unavailable</Button>}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <Button variant="ghost" size="sm" className="h-9 px-1 text-muted-foreground" onClick={onLetter} disabled={disabled} aria-label={`Generate Cover Letter for ${job.title}`}>
            {busyAction === "letter" ? <Loader2 className="animate-spin" /> : <Mail />}{busyAction === "letter" ? "Writing…" : "Cover Letter · 1 credit"}
          </Button>
          <Button variant="ghost" size="sm" className="h-9 px-1 text-muted-foreground" onClick={onPrep} disabled={disabled} aria-label={`Interview Prep for ${job.title}`}>
            {busyAction === "prep" ? <Loader2 className="animate-spin" /> : <MessagesSquare />}{busyAction === "prep" ? "Preparing…" : "Interview Prep · 1 credit"}
          </Button>
        </div>
      </div>

      <aside aria-label={`Job insights for ${job.title}`} className="flex flex-col gap-4 bg-jobs-panel p-5 text-jobs-panel-foreground sm:p-6">
        <p className="flex items-center gap-2 text-xs font-semibold"><Sparkles className="size-4 text-jobs-panel-accent" />3-second truth</p>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs text-jobs-panel-muted"><Wallet className="size-3.5" />CTC estimate</p>
          <p className="break-words text-lg font-semibold leading-snug">{truth.estimated_ctc_range || "Not disclosed"}</p>
          {truth.estimated_ctc_range && <p className="mt-1 text-xs text-jobs-panel-muted">AI estimate · not employer confirmed</p>}
        </div>
        <div className="space-y-2 border-t border-jobs-panel-border pt-4 text-xs text-jobs-panel-muted">
          <p className="flex gap-2"><Check className="size-3.5 shrink-0 text-jobs-panel-accent" />Company career feed</p>
          <p className="flex gap-2"><Check className="size-3.5 shrink-0 text-jobs-panel-accent" />{stack.length ? "Tech stack extracted" : "Tech stack not disclosed"}</p>
        </div>
        {warnings.length > 0 && <div className="space-y-2 border-t border-jobs-panel-border pt-3">{warnings.map((warning, index) => <p key={index} className="flex gap-2 text-xs leading-relaxed text-jobs-panel-foreground"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-jobs-panel-accent" />{warning}</p>)}<p className="text-xs text-jobs-panel-muted">AI flags · verify before applying</p></div>}
      </aside>
    </article>
  );
}