import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, Plus, Trash2, X, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ResumeImporter } from "@/components/dashboard/ResumeImporter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  type MasterResume as Resume, type Extra, completion, hasContent, loadResume, masterResumeSchema, seedFromProfile, toPlainText,
  newCertification, newEducation, newExperience, newExtra, newProject,
} from "@/lib/masterResume";

type Status = "idle" | "dirty" | "saving" | "saved" | "error";
const card = "resume-section space-y-5";

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}

function Bullets({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return <div className="space-y-2">
    <Label>{label}</Label>
    {items.map((b, i) => <div key={i} className="flex gap-2">
      <Input aria-label={`${label} ${i + 1}`} maxLength={500} value={b} onChange={e => onChange(items.map((x, j) => j === i ? e.target.value : x))} />
      <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${label} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}><X className="size-4" /></Button>
    </div>)}
    <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}><Plus className="size-4" />Add bullet</Button>
  </div>;
}

function Tags({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const next = [...items];
    for (const p of draft.split(",").map(x => x.trim().slice(0, 60)).filter(Boolean)) if (!next.some(s => s.toLowerCase() === p.toLowerCase())) next.push(p);
    onChange(next.slice(0, 60)); setDraft("");
  };
  return <div className="space-y-2">
    <Label>{label}</Label>
    <div className="flex gap-2"><Input aria-label={`Add ${label}`} placeholder="Type and press Enter (comma-separated)" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }} /><Button type="button" variant="outline" onClick={add}>Add</Button></div>
    <div className="flex flex-wrap gap-2">{items.length === 0 ? <p className="text-xs text-muted-foreground">None added.</p> : items.map(s => <span key={s} className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-3 py-1 text-sm">{s}<button type="button" aria-label={`Remove ${s}`} onClick={() => onChange(items.filter(x => x !== s))}><X className="size-3" /></button></span>)}</div>
  </div>;
}

function Section({ title, missing, action, children }: { title: string; missing?: boolean; action?: React.ReactNode; children: React.ReactNode }) {
  return <section id={`resume-section-${["Personal information", "Professional summary", "Work experience", "Education", "Skills", "Projects", "Certifications", "Additional information"].indexOf(title)}`} className={card} aria-label={title}>
    <div className="flex items-center justify-between gap-3 flex-wrap"><h2 className="font-semibold text-lg flex items-center gap-2">{title}{missing && <Badge variant="outline" className="text-warning border-warning/30">Missing</Badge>}</h2>{action}</div>
    {children}
  </section>;
}

const extraKinds: { kind: Extra["kind"]; label: string }[] = [{ kind: "language", label: "Languages" }, { kind: "volunteer", label: "Volunteer experience" }, { kind: "award", label: "Awards" }, { kind: "publication", label: "Publications" }, { kind: "other", label: "Other information" }];

export default function MasterResume() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["master-resume", user?.id], enabled: Boolean(user), queryFn: async () => {
    if (!user) throw new Error("Please sign in.");
    const { data, error } = await supabase.from("profiles").select("full_name,display_name,country,preferred_location,headline,skills,experience,education,master_resume_json,master_resume_text").eq("user_id", user.id).single();
    if (error) throw error;
    return data;
  } });
  const [r, setR] = useState<Resume | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [replaceText, setReplaceText] = useState(true);
  const [pending, setPending] = useState<{ label: string; run: () => void } | null>(null);
  const [seeded, setSeeded] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!q.data || r) return;
    const stored = loadResume(q.data.master_resume_json);
    const isSeed = !hasContent(stored);
    const next = isSeed ? seedFromProfile(q.data, user?.email ?? "") : stored;
    if (!next.personal.email) next.personal.email = user?.email ?? "";
    setR(next); setSeeded(isSeed && hasContent(next));
    const text = (q.data.master_resume_text ?? "").trim();
    setReplaceText(!text || text === toPlainText(stored));
  }, [q.data, r, user?.email]);

  const comp = useMemo(() => r ? completion(r) : null, [r]);
  const existingText = (q.data?.master_resume_text ?? "").trim();
  const edit = (fn: (d: Resume) => void) => { setR(prev => { if (!prev) return prev; const d = structuredClone(prev); fn(d); return d; }); setStatus("dirty"); };
  const confirmDelete = (label: string, run: () => void) => setPending({ label, run });

  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (status === "dirty") e.preventDefault(); }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [status]);

  async function save(candidate: Resume | null = r, imported = false): Promise<boolean> {
    if (!candidate || !user || inFlight.current) return false;
    const parsed = masterResumeSchema.safeParse(candidate);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      parsed.error.issues.forEach(i => { map[i.path.join(".")] = i.message; });
      setErrors(map); setStatus("error"); toast.error("Please fix the highlighted fields before saving."); return false;
    }
    setErrors({});
    inFlight.current = true; setStatus("saving");
    const text = toPlainText(parsed.data);
    const payload: { master_resume_json: Resume; master_resume_text?: string | null } = { master_resume_json: parsed.data };
    if (replaceText && !imported) payload.master_resume_text = text || null;
    let data: { user_id: string } | null = null;
    let error: unknown = null;
    try {
      const result = await supabase.from("profiles").update(payload as never).eq("user_id", user.id).select("user_id").maybeSingle();
      data = result.data; error = result.error;
    } catch (e) { error = e; }
    inFlight.current = false;
    if (error || !data) { setStatus("error"); toast.error("Couldn't save your Master Resume. Your previous saved version is unchanged."); return false; }
    setStatus("saved"); setSeeded(false); setR(parsed.data);
    toast.success("Master Resume saved");
    qc.invalidateQueries({ queryKey: ["master-resume"] });
    qc.invalidateQueries({ queryKey: ["workspace-home"] });
    qc.invalidateQueries({ queryKey: ["resume-availability"] });
    qc.invalidateQueries({ queryKey: ["getting-started"] });
    qc.invalidateQueries({ queryKey: ["my-profile"] });
    return true;
  }

  if (q.isPending || (!r && !q.isError)) return <p role="status" className="p-6">Loading Master Resume…</p>;
  if (q.isError || !r || !comp) return <div className={card}><p>We couldn't load your Master Resume. Please refresh to try again.</p></div>;
  const e = (k: string) => errors[k];
  const statusText = { idle: "All changes saved", dirty: "Unsaved changes", saving: "Saving…", saved: "Saved", error: "Not saved" }[status];

  return <div className="master-resume-page w-full pb-6">
    <PageHeader eyebrow="Workspace" title="Master Resume" description="Your central career profile. Tailored resumes, cover letters and interview prep are built only from what you enter here." />
    <ResumeImporter existing={r} disabled={status === "saving"} onConfirm={candidate => save(candidate, true)} />

    <section className="highlight-panel p-5 mb-5 space-y-3" aria-label="Resume completion">
      <div className="flex items-center justify-between flex-wrap gap-2"><h2 className="font-semibold">Completion</h2><Badge variant={comp.label === "Core complete" ? "default" : "secondary"}>{comp.label}</Badge></div>
      <ul className="grid sm:grid-cols-2 gap-1.5 text-sm">
        {[...comp.done.map(d => [d, true] as const), ...comp.missing.map(m => [m, false] as const)].map(([n, ok]) => <li key={n} className="flex items-center gap-2">{ok ? <CheckCircle2 className="size-4 text-primary" /> : <Circle className="size-4 text-muted-foreground" />}<span className={ok ? "" : "text-muted-foreground"}>{n}</span></li>)}
      </ul>
      {comp.missing.length > 0 && <p className="text-sm text-muted-foreground">Next: add your <strong className="text-foreground">{comp.missing[0].toLowerCase()}</strong>. Projects, certifications and extras are optional. You can save at any time.</p>}
    </section>

    {!hasContent(r) && <div className={`${card} mb-5 text-center`}><FileText className="size-8 mx-auto text-muted-foreground" /><h2 className="font-semibold">Your Master Resume is empty</h2><p className="text-sm text-muted-foreground">Start with your personal information below. Nothing is filled in for you.</p></div>}
    {seeded && <p className="mb-5 rounded-lg border border-border bg-secondary/50 p-3 text-sm">We filled in details you already gave during onboarding or in My profile. Review them, then save. Nothing is stored until you press Save.</p>}
    {existingText && !replaceText && <div className="mb-5 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm space-y-2 text-foreground">
      <p className="flex gap-2"><AlertTriangle className="size-4 shrink-0 mt-0.5" />Your pasted resume text stays unchanged. Generators prefer usable saved Master Resume facts; pasted text is a separate fallback only when saved structured career information is unavailable.</p>
      <details><summary className="cursor-pointer font-medium">View pasted resume text</summary><pre className="mt-2 whitespace-pre-wrap font-sans max-h-64 overflow-auto">{existingText}</pre></details>
    </div>}

    <div className="grid xl:grid-cols-[180px_minmax(0,1fr)] gap-6 items-start">
      <nav aria-label="Resume sections" className="xl:sticky xl:top-6 flex xl:flex-col flex-wrap gap-1 bg-muted p-3">{["Personal information", "Professional summary", "Work experience", "Education", "Skills", "Projects", "Certifications", "Additional information"].map((title, i) => <Button key={title} asChild variant="ghost" size="sm" className="justify-start text-xs"><a href={`#resume-section-${i}`}>{title}</a></Button>)}</nav>
    <div className="space-y-2 min-w-0">
      <Section title="Personal information" missing={comp.missing.includes("Personal information")}>
        <div className="grid sm:grid-cols-2 gap-4">
          {([["fullName", "Full name", "text"], ["email", "Email", "email"], ["phone", "Phone number", "tel"], ["city", "City", "text"], ["country", "Country", "text"], ["linkedinUrl", "LinkedIn URL", "url"], ["githubUrl", "GitHub URL", "url"], ["portfolioUrl", "Portfolio URL", "url"]] as const).map(([k, l, t]) =>
            <Field key={k} id={`p-${k}`} label={l} error={e(`personal.${k}`)}><Input id={`p-${k}`} type={t} maxLength={k.endsWith("Url") ? 300 : 200} placeholder={k.endsWith("Url") ? "https://" : undefined} value={r.personal[k]} onChange={ev => edit(d => { d.personal[k] = ev.target.value; })} /></Field>)}
        </div>
      </Section>

      <Section title="Professional summary" missing={comp.missing.includes("Professional summary")}>
        <div className="grid sm:grid-cols-[1fr_180px] gap-4">
          <Field id="s-headline" label="Professional headline" error={e("summary.headline")}><Input id="s-headline" maxLength={150} value={r.summary.headline} onChange={ev => edit(d => { d.summary.headline = ev.target.value; })} /></Field>
          <Field id="s-years" label="Years of experience" error={e("summary.yearsExperience")}><Input id="s-years" inputMode="decimal" maxLength={4} value={r.summary.yearsExperience} onChange={ev => edit(d => { d.summary.yearsExperience = ev.target.value; })} /></Field>
        </div>
        <Field id="s-summary" label="Career summary (in your own words)" error={e("summary.summary")}><Textarea id="s-summary" rows={5} maxLength={3000} value={r.summary.summary} onChange={ev => edit(d => { d.summary.summary = ev.target.value; })} /></Field>
      </Section>

      <Section title="Work experience" missing={comp.missing.includes("Work experience")} action={<Button type="button" variant="outline" size="sm" onClick={() => edit(d => { d.experience.push(newExperience()); })}><Plus className="size-4" />Add experience</Button>}>
        {r.experience.length === 0 && <p className="text-sm text-muted-foreground">No work experience added yet.</p>}
        {r.experience.map((x, i) => {
          const set = (fn: (y: typeof x) => void) => edit(d => fn(d.experience[i]));
          return <div key={x.id} className="border border-border rounded-lg p-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field id={`e-t-${x.id}`} label="Job title"><Input id={`e-t-${x.id}`} maxLength={120} value={x.title} onChange={ev => set(y => { y.title = ev.target.value; })} /></Field>
              <Field id={`e-c-${x.id}`} label="Company"><Input id={`e-c-${x.id}`} maxLength={120} value={x.company} onChange={ev => set(y => { y.company = ev.target.value; })} /></Field>
              <Field id={`e-y-${x.id}`} label="Employment type"><select id={`e-y-${x.id}`} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={x.employmentType} onChange={ev => set(y => { y.employmentType = ev.target.value; })}><option value="">Select</option>{["Full-time", "Part-time", "Internship", "Contract", "Freelance"].map(o => <option key={o}>{o}</option>)}</select></Field>
              <Field id={`e-l-${x.id}`} label="Location"><Input id={`e-l-${x.id}`} maxLength={120} value={x.location} onChange={ev => set(y => { y.location = ev.target.value; })} /></Field>
              <Field id={`e-s-${x.id}`} label="Start date"><Input id={`e-s-${x.id}`} type="month" value={x.startDate} onChange={ev => set(y => { y.startDate = ev.target.value; })} /></Field>
              <Field id={`e-e-${x.id}`} label="End date" error={e(`experience.${i}.endDate`)}><Input id={`e-e-${x.id}`} type="month" disabled={x.current} value={x.current ? "" : x.endDate} onChange={ev => set(y => { y.endDate = ev.target.value; })} /></Field>
            </div>
            <div className="flex items-center gap-2"><Switch id={`e-cur-${x.id}`} checked={x.current} onCheckedChange={v => set(y => { y.current = v; if (v) y.endDate = ""; })} /><Label htmlFor={`e-cur-${x.id}`}>I currently work here</Label></div>
            <Bullets label="Responsibilities" items={x.responsibilities} onChange={v => set(y => { y.responsibilities = v; })} />
            <Bullets label="Achievements" items={x.achievements} onChange={v => set(y => { y.achievements = v; })} />
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => confirmDelete(x.title || "this experience", () => edit(d => { d.experience.splice(i, 1); }))}><Trash2 className="size-4" />Delete experience</Button>
          </div>;
        })}
      </Section>

      <Section title="Education" missing={comp.missing.includes("Education")} action={<Button type="button" variant="outline" size="sm" onClick={() => edit(d => { d.education.push(newEducation()); })}><Plus className="size-4" />Add education</Button>}>
        {r.education.length === 0 && <p className="text-sm text-muted-foreground">No education added yet.</p>}
        {r.education.map((x, i) => {
          const set = (fn: (y: typeof x) => void) => edit(d => fn(d.education[i]));
          return <div key={x.id} className="border border-border rounded-lg p-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field id={`d-d-${x.id}`} label="Degree"><Input id={`d-d-${x.id}`} maxLength={120} value={x.degree} onChange={ev => set(y => { y.degree = ev.target.value; })} /></Field>
              <Field id={`d-i-${x.id}`} label="Institution"><Input id={`d-i-${x.id}`} maxLength={160} value={x.institution} onChange={ev => set(y => { y.institution = ev.target.value; })} /></Field>
              <Field id={`d-f-${x.id}`} label="Field of study"><Input id={`d-f-${x.id}`} maxLength={120} value={x.field} onChange={ev => set(y => { y.field = ev.target.value; })} /></Field>
              <Field id={`d-g-${x.id}`} label="Grade or GPA (optional)"><Input id={`d-g-${x.id}`} maxLength={40} value={x.grade} onChange={ev => set(y => { y.grade = ev.target.value; })} /></Field>
              <Field id={`d-s-${x.id}`} label="Start date"><Input id={`d-s-${x.id}`} type="month" value={x.startDate} onChange={ev => set(y => { y.startDate = ev.target.value; })} /></Field>
              <Field id={`d-e-${x.id}`} label="End date" error={e(`education.${i}.endDate`)}><Input id={`d-e-${x.id}`} type="month" value={x.endDate} onChange={ev => set(y => { y.endDate = ev.target.value; })} /></Field>
            </div>
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => confirmDelete(x.degree || "this education entry", () => edit(d => { d.education.splice(i, 1); }))}><Trash2 className="size-4" />Delete education</Button>
          </div>;
        })}
      </Section>

      <Section title="Skills" missing={comp.missing.includes("Skills")}>
        <p className="text-sm text-muted-foreground">Add only skills you actually have. Every category is optional.</p>
        <div className="grid md:grid-cols-2 gap-5">
          {([["technical", "Technical skills"], ["tools", "Tools and technologies"], ["soft", "Soft skills"], ["other", "Other skills"]] as const).map(([k, l]) => <Tags key={k} label={l} items={r.skills[k]} onChange={v => edit(d => { d.skills[k] = v; })} />)}
        </div>
      </Section>

      <Section title="Projects" action={<Button type="button" variant="outline" size="sm" onClick={() => edit(d => { d.projects.push(newProject()); })}><Plus className="size-4" />Add project</Button>}>
        {r.projects.length === 0 && <p className="text-sm text-muted-foreground">Optional. No projects added.</p>}
        {r.projects.map((x, i) => {
          const set = (fn: (y: typeof x) => void) => edit(d => fn(d.projects[i]));
          return <div key={x.id} className="border border-border rounded-lg p-4 space-y-4">
            <Field id={`pr-n-${x.id}`} label="Project name"><Input id={`pr-n-${x.id}`} maxLength={120} value={x.name} onChange={ev => set(y => { y.name = ev.target.value; })} /></Field>
            <Field id={`pr-d-${x.id}`} label="Description"><Textarea id={`pr-d-${x.id}`} rows={3} maxLength={1500} value={x.description} onChange={ev => set(y => { y.description = ev.target.value; })} /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field id={`pr-u-${x.id}`} label="Project URL" error={e(`projects.${i}.url`)}><Input id={`pr-u-${x.id}`} type="url" placeholder="https://" value={x.url} onChange={ev => set(y => { y.url = ev.target.value; })} /></Field>
              <Field id={`pr-g-${x.id}`} label="GitHub URL" error={e(`projects.${i}.githubUrl`)}><Input id={`pr-g-${x.id}`} type="url" placeholder="https://" value={x.githubUrl} onChange={ev => set(y => { y.githubUrl = ev.target.value; })} /></Field>
            </div>
            <Tags label="Technologies used" items={x.technologies} onChange={v => set(y => { y.technologies = v; })} />
            <Bullets label="Responsibilities" items={x.responsibilities} onChange={v => set(y => { y.responsibilities = v; })} />
            <Bullets label="Achievements" items={x.achievements} onChange={v => set(y => { y.achievements = v; })} />
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => confirmDelete(x.name || "this project", () => edit(d => { d.projects.splice(i, 1); }))}><Trash2 className="size-4" />Delete project</Button>
          </div>;
        })}
      </Section>

      <Section title="Certifications" action={<Button type="button" variant="outline" size="sm" onClick={() => edit(d => { d.certifications.push(newCertification()); })}><Plus className="size-4" />Add certification</Button>}>
        {r.certifications.length === 0 && <p className="text-sm text-muted-foreground">Optional. No certifications added.</p>}
        {r.certifications.map((x, i) => {
          const set = (fn: (y: typeof x) => void) => edit(d => fn(d.certifications[i]));
          return <div key={x.id} className="border border-border rounded-lg p-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field id={`c-n-${x.id}`} label="Certification name"><Input id={`c-n-${x.id}`} maxLength={160} value={x.name} onChange={ev => set(y => { y.name = ev.target.value; })} /></Field>
              <Field id={`c-o-${x.id}`} label="Issuing organization"><Input id={`c-o-${x.id}`} maxLength={160} value={x.issuer} onChange={ev => set(y => { y.issuer = ev.target.value; })} /></Field>
              <Field id={`c-i-${x.id}`} label="Issue date"><Input id={`c-i-${x.id}`} type="month" value={x.issueDate} onChange={ev => set(y => { y.issueDate = ev.target.value; })} /></Field>
              <Field id={`c-x-${x.id}`} label="Expiration date (optional)" error={e(`certifications.${i}.expiryDate`)}><Input id={`c-x-${x.id}`} type="month" value={x.expiryDate} onChange={ev => set(y => { y.expiryDate = ev.target.value; })} /></Field>
            </div>
            <Field id={`c-u-${x.id}`} label="Credential URL (optional)" error={e(`certifications.${i}.credentialUrl`)}><Input id={`c-u-${x.id}`} type="url" placeholder="https://" value={x.credentialUrl} onChange={ev => set(y => { y.credentialUrl = ev.target.value; })} /></Field>
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => confirmDelete(x.name || "this certification", () => edit(d => { d.certifications.splice(i, 1); }))}><Trash2 className="size-4" />Delete certification</Button>
          </div>;
        })}
      </Section>

      <Section title="Additional information">
        <p className="text-sm text-muted-foreground">Optional sections.</p>
        {extraKinds.map(({ kind, label }) => {
          const items = r.additional.map((a, i) => [a, i] as const).filter(([a]) => a.kind === kind);
          return <div key={kind} className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-medium">{label}</h3><Button type="button" variant="outline" size="sm" onClick={() => edit(d => { d.additional.push(newExtra(kind)); })}><Plus className="size-4" />Add</Button></div>
            {items.map(([a, i]) => <div key={a.id} className="grid sm:grid-cols-[1fr_2fr_auto] gap-2 items-start">
              <Input aria-label={`${label} title`} placeholder="Title" maxLength={160} value={a.title} onChange={ev => edit(d => { d.additional[i].title = ev.target.value; })} />
              <Input aria-label={`${label} details`} placeholder="Details" maxLength={1000} value={a.details} onChange={ev => edit(d => { d.additional[i].details = ev.target.value; })} />
              <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${label} entry`} onClick={() => confirmDelete(a.title || `this ${label.toLowerCase()} entry`, () => edit(d => { d.additional.splice(i, 1); }))}><Trash2 className="size-4" /></Button>
            </div>)}
          </div>;
        })}
      </Section>
    </div>
    </div>

    <div className="sticky bottom-0 z-30 mt-6 rounded-lg border border-border bg-card shadow-subtle">
      <div className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-col gap-1">
          <p role="status" aria-live="polite" className={`text-sm font-medium ${status === "error" ? "text-destructive" : status === "dirty" ? "text-warning" : "text-muted-foreground"}`}>{statusText}</p>
          {existingText && <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={replaceText} onCheckedChange={setReplaceText} aria-label="Replace pasted resume text" />Also replace the legacy pasted text on save</label>}
        </div>
        <Button type="button" onClick={() => void save()} disabled={status === "saving"}>{status === "saving" ? <><Loader2 className="size-4 animate-spin" />Saving…</> : "Save Master Resume"}</Button>
      </div>
    </div>

    <AlertDialog open={Boolean(pending)} onOpenChange={o => !o && setPending(null)}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Delete {pending?.label}?</AlertDialogTitle><AlertDialogDescription>This removes the entry from your editor. It is permanently removed after you save.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { pending?.run(); setPending(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
