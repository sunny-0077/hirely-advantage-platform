import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Briefcase, ExternalLink, Mail, MessagesSquare, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const TRACKER_STATUSES = [
  { value: "preparing", label: "Preparing" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
] as const;

type App = { id: string; role: string; company: string; tracker_status: string; notes: string | null; job_url: string | null; location: string | null; tailoring_id: string | null; cover_letter_id: string | null; interview_prep_id: string | null; updated_at: string };

export default function MyApplications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const q = useQuery({
    queryKey: ["my-applications", user?.id], enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("applications").select("id,role,company,tracker_status,notes,job_url,location,tailoring_id,cover_letter_id,interview_prep_id,updated_at").eq("user_id", user!.id).order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as App[];
    },
  });
  const apps = (q.data ?? []).filter(a => filter === "all" || a.tracker_status === filter);
  const counts = Object.fromEntries(TRACKER_STATUSES.map(s => [s.value, (q.data ?? []).filter(a => a.tracker_status === s.value).length]));

  return <div className="max-w-5xl mx-auto">
    <PageHeader eyebrow="Applications" title="Track every job you're going for." description="Jobs show up here automatically when you create a tailored resume, cover letter or interview prep." />
    <div className="flex flex-wrap gap-2 mb-6">
      <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All ({q.data?.length ?? 0})</Button>
      {TRACKER_STATUSES.map(s => <Button key={s.value} size="sm" variant={filter === s.value ? "default" : "outline"} onClick={() => setFilter(s.value)}>{s.label} ({counts[s.value] ?? 0})</Button>)}
    </div>
    {q.error && <p role="alert" className="text-destructive">Couldn't load applications. <Button variant="link" onClick={() => q.refetch()}>Retry</Button></p>}
    {q.isPending ? <p role="status">Loading…</p> : apps.length ? <div className="grid gap-4">{apps.map(a => <AppCard key={a.id} app={a} onChange={() => qc.invalidateQueries({ queryKey: ["my-applications"] })} />)}</div>
      : <div className="rounded-lg border border-dashed border-border p-10 text-center"><Briefcase className="size-6 mx-auto text-muted-foreground mb-3" /><p className="font-medium">No applications here yet</p><p className="text-sm text-muted-foreground mb-4">Generate a document for a job and it'll appear here.</p><Button asChild><Link to="/app/jobs">Browse jobs</Link></Button></div>}
  </div>;
}

function AppCard({ app, onChange }: { app: App; onChange: () => void }) {
  const [notes, setNotes] = useState(app.notes ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => setNotes(app.notes ?? ""), [app.notes]);

  async function update(patch: Partial<App>) {
    setSaving(true);
    const { error } = await supabase.from("applications").update(patch).eq("id", app.id);
    setSaving(false);
    if (error) { toast.error("Couldn't save. Please try again."); return; }
    onChange();
  }
  async function remove() {
    if (!confirm(`Remove ${app.role} at ${app.company} from your tracker? Your documents stay in My documents.`)) return;
    const { error } = await supabase.from("applications").delete().eq("id", app.id);
    if (error) toast.error("Couldn't remove it."); else onChange();
  }

  const docs = [
    { id: app.tailoring_id, param: "tailoring", label: "Tailored resume", icon: Sparkles },
    { id: app.cover_letter_id, param: "letter", label: "Cover letter", icon: Mail },
    { id: app.interview_prep_id, param: "prep", label: "Interview prep", icon: MessagesSquare },
  ];

  return <article className="bg-card border border-border rounded-lg p-5 space-y-4">
    <div className="flex flex-wrap items-start gap-3">
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold break-words">{app.role}</h2>
        <p className="text-sm text-muted-foreground">{app.company}{app.location ? ` · ${app.location}` : ""}</p>
      </div>
      <Select value={app.tracker_status} onValueChange={v => update({ tracker_status: v })}>
        <SelectTrigger className="w-40" aria-label="Application status"><SelectValue /></SelectTrigger>
        <SelectContent>{TRACKER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
      </Select>
      {app.job_url && <Button asChild size="icon" variant="ghost" aria-label="Open job posting"><a href={app.job_url} target="_blank" rel="noopener noreferrer"><ExternalLink /></a></Button>}
      <Button size="icon" variant="ghost" aria-label="Remove application" onClick={remove}><Trash2 /></Button>
    </div>
    <div className="flex flex-wrap gap-2">{docs.map(d => d.id
      ? <Button key={d.param} asChild size="sm" variant="outline"><Link to={`/app/documents?${d.param}=${d.id}`}><d.icon />{d.label}</Link></Button>
      : <Button key={d.param} size="sm" variant="outline" disabled><d.icon />No {d.label.toLowerCase()} yet</Button>)}</div>
    <div className="space-y-2">
      <Textarea aria-label="Personal notes" rows={2} maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes: recruiter name, follow-up date, salary talk…" />
      {notes !== (app.notes ?? "") && <Button size="sm" disabled={saving} onClick={() => update({ notes: notes.trim() || null })}>{saving ? "Saving…" : "Save notes"}</Button>}
    </div>
  </article>;
}
