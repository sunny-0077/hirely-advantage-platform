import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, FileUp, Loader2, PenLine, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoLockup } from "@/components/landing/Logo";
import { cn } from "@/lib/utils";
import { validateImportFile, mapResumeText } from "@/lib/resumeImport";
import { hashResumeText } from "@/lib/resumeHash";
import { EXPERIENCE_LEVELS, POPULAR_ROLES, postOnboardingPath, type TemplateStyle } from "@/lib/jobPreferences";

import { JobLocationPicker } from "@/components/dashboard/JobLocationPicker";

const TOTAL = 5;
type Form = { resume_mode: "upload" | "build" | null; resume_file_url: string | null; resume_name: string; preferred_template: TemplateStyle | null; target_job_role: string; experience_level: string; preferred_locations: string[]; work_modes: string[] };
const EMPTY: Form = { resume_mode: null, resume_file_url: null, resume_name: "", preferred_template: null, target_job_role: "", experience_level: "", preferred_locations: [], work_modes: [] };

function choice(active: boolean) {
  return cn("rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active ? "border-primary bg-accent shadow-sm" : "border-border bg-card/70 hover:border-primary/50");
}

export default function Onboarding() {
  const { user, loading, recovering } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>(EMPTY);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const [roleQuery, setRoleQuery] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const initialized = useRef<string | null>(null);
  const profile = useQuery({ queryKey: ["onboarding-profile", user?.id], enabled: Boolean(user), queryFn: async () => {
    if (!user) throw new Error("Please sign in again.");
    const { data, error } = await supabase.from("profiles").select("full_name,country,resume_mode,resume_file_url,preferred_template,target_job_role,experience_level,preferred_locations,work_modes,onboarding_step,onboarding_completed").eq("user_id", user.id).single();
    if (error) throw error;
    return data;
  } });
  useEffect(() => {
    const d = profile.data;
    if (!d || !user || initialized.current === user.id) return;
    setForm({ resume_mode: (d.resume_mode as Form["resume_mode"]) ?? null, resume_file_url: d.resume_file_url, resume_name: d.resume_file_url ? d.resume_file_url.split("/").pop()?.replace(/^\d+-/, "") ?? "" : "", preferred_template: (d.preferred_template as TemplateStyle) ?? null, target_job_role: d.target_job_role ?? "", experience_level: d.experience_level ?? "", preferred_locations: d.preferred_locations ?? [], work_modes: d.work_modes ?? [] });
    setRoleQuery(d.target_job_role ?? "");
    setStep(Math.min(TOTAL, Math.max(1, d.onboarding_step)));
    initialized.current = user.id;
  }, [profile.data, user]);

  if (loading || (user && profile.isPending)) return <main className="p-10" role="status">Loading account…</main>;
  if (!user) return <Navigate to="/auth?mode=signup" replace />;
  if (recovering) return <Navigate to="/reset-password" replace />;
  if (profile.data?.onboarding_completed) return <Navigate to="/app/home" replace />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(p => ({ ...p, [k]: v }));
  const valid = [
    form.resume_mode === "build" || (form.resume_mode === "upload" && !!form.resume_file_url),
    form.resume_mode === "upload" || !!form.preferred_template,
    form.target_job_role.trim().length > 1,
    !!form.experience_level,
    form.preferred_locations.length > 0 && form.work_modes.length > 0,
  ][step - 1];

  async function uploadResume(file: File | undefined) {
    if (!file || !user) return;
    setNotice("");
    try { validateImportFile(file); } catch (e) { setNotice(e instanceof Error ? e.message : "Choose a PDF or DOCX."); return; }
    setUploading(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) throw new Error("Please sign in again.");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-master-resume`, { method: "POST", headers: { Authorization: `Bearer ${s.session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/octet-stream", "x-resume-filename": encodeURIComponent(file.name) }, body: file });
      const out = await res.json();
      if (!res.ok || typeof out.text !== "string" || out.text.trim().length < 80) throw new Error(out.error || "Couldn't read enough text from this resume.");
      const text: string = out.text.slice(0, 50000);
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const mime = file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const up = await supabase.storage.from("resumes").upload(path, file, { contentType: mime, upsert: false });
      if (up.error) throw new Error("Upload failed. Please try again.");
      const content_hash = await hashResumeText(text);
      const { data: existing } = await supabase.from("resumes").select("id").eq("user_id", user.id).eq("content_hash", content_hash).maybeSingle();
      if (!existing) {
        const ins = await supabase.from("resumes").insert({ user_id: user.id, file_name: file.name, file_path: path, file_size: file.size, mime_type: mime, raw_text: text, content_hash });
        if (ins.error) { await supabase.storage.from("resumes").remove([path]); throw new Error(ins.error.message.includes("quota") ? "You've reached your resume upload limit." : "Couldn't save this resume."); }
      }
      // Fill only empty profile details, using facts found in the user's own resume.
      const facts = mapResumeText(text).resume;
      const p = profile.data;
      const patch: { full_name?: string; display_name?: string; country?: string } = {};
      if (!p?.full_name && facts.personal.fullName) { patch.full_name = facts.personal.fullName; patch.display_name = facts.personal.fullName; }
      if (!p?.country && facts.personal.country) patch.country = facts.personal.country;
      if (Object.keys(patch).length) await supabase.from("profiles").update(patch).eq("user_id", user.id);
      if (!form.target_job_role && facts.summary.headline) { set("target_job_role", facts.summary.headline.slice(0, 120)); setRoleQuery(facts.summary.headline.slice(0, 120)); }
      setForm(f => ({ ...f, resume_mode: "upload", resume_file_url: path, resume_name: file.name }));
    } catch (e) { setNotice(e instanceof Error ? e.message : "Couldn't upload this resume."); }
    finally { setUploading(false); }
  }

  async function persist(nextStep: number, complete: boolean) {
    if (!user) return false;
    setBusy(true); setNotice("");
    try {
      const { data, error } = await supabase.from("profiles").update({
        resume_mode: form.resume_mode, resume_file_url: form.resume_mode === "upload" ? form.resume_file_url : null,
        preferred_template: form.preferred_template, target_job_role: form.target_job_role.trim().slice(0, 200) || null,
        experience_level: form.experience_level || null, preferred_locations: form.preferred_locations, work_modes: form.work_modes,
        preferred_job_location: form.preferred_locations.join("; ").slice(0, 200) || null,
        employment_preference: form.work_modes.length === 1 && form.work_modes[0] === "Remote" ? "Remote" : "Full-time",
        onboarding_step: nextStep, onboarding_completed: complete,
      }).eq("user_id", user.id).select("user_id").maybeSingle();
      if (error || !data) throw error ?? new Error();
      return true;
    } catch { setNotice("Couldn't save your answers. Please try again."); return false; }
    finally { setBusy(false); }
  }

  async function next() {
    if (!valid || busy || !user) return;
    if (step < TOTAL) {
      const target = step === 1 && form.resume_mode === "upload" ? 3 : step + 1;
      if (await persist(target, false)) setStep(target);
      return;
    }
    if (await persist(TOTAL, true)) {
      await queryClient.invalidateQueries({ queryKey: ["workspace", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["onboarding-profile", user.id] });
      navigate(postOnboardingPath(form), { replace: true });
    }
  }
  const back = () => setStep(s => (s === 3 && form.resume_mode === "upload" ? 1 : Math.max(1, s - 1)));

  const roleSuggestions = POPULAR_ROLES.filter(r => r.toLowerCase().includes(roleQuery.trim().toLowerCase())).slice(0, 8);
  const heads = [
    ["How would you like to start?", "Upload your current resume for an instant AI score, or build a new one from scratch."],
    ["Which resume style do you prefer?", "We'll format your details using this layout in the AI Resume Builder."],
    ["What job title are you aiming for?", "This personalizes your AI Resume Builder, Cover Letter Generator, and Interview Prep questions."],
    ["What is your current experience level?", "Helps us calibrate your Resume Analyzer grading and Interview Prep difficulty."],
    ["Where should we find jobs for you?", "Choose up to 3 cities or countries, plus worldwide remote roles."],
  ][step - 1];

  return <main className="onboarding-mesh min-h-screen px-4 py-8 sm:py-14 flex justify-center items-start">
    <div className="w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between"><LogoLockup size="text-xl" /><span className="text-sm text-muted-foreground">Step {step} of {TOTAL}</span></div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step} aria-label="Onboarding progress">
        <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: `${(step / TOTAL) * 100}%` }} />
      </div>
      <section className="rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl shadow-lg p-5 sm:p-8 space-y-6">
        <header className="space-y-2"><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{heads[0]}</h1><p className="text-muted-foreground">{heads[1]}</p></header>
        {profile.error && <p role="alert" className="text-destructive">Couldn't load your account. <Button variant="link" onClick={() => profile.refetch()}>Retry</Button></p>}

        {step === 1 && <div className="grid gap-4 sm:grid-cols-2">
          <div role="button" tabIndex={0} aria-pressed={form.resume_mode === "upload"} aria-label="Upload Existing Resume"
            onClick={() => fileInput.current?.click()} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.current?.click(); } }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); void uploadResume(e.dataTransfer.files?.[0]); }}
            className={cn(choice(form.resume_mode === "upload"), "p-5 border-dashed cursor-pointer min-h-44 flex flex-col gap-3", dragging && "border-primary bg-accent")}>
            {uploading ? <Loader2 className="size-6 animate-spin text-primary" /> : form.resume_file_url ? <Check className="size-6 text-primary" /> : <FileUp className="size-6 text-primary" />}
            <span className="font-semibold">Upload Existing Resume</span>
            <span className="text-sm text-muted-foreground">{uploading ? "Reading your resume…" : form.resume_file_url ? form.resume_name || "Resume uploaded" : "Drag and drop a PDF or DOCX, or tap to choose. Up to 5 MB."}</span>
            <input ref={fileInput} type="file" accept=".pdf,.docx" className="sr-only" onChange={e => { void uploadResume(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          <button type="button" aria-pressed={form.resume_mode === "build"} onClick={() => set("resume_mode", "build")} className={cn(choice(form.resume_mode === "build"), "p-5 min-h-44 flex flex-col gap-3")}>
            <PenLine className="size-6 text-primary" /><span className="font-semibold">Build a New Resume</span>
            <span className="text-sm text-muted-foreground">Start from scratch in the AI Resume Builder.</span>
          </button>
        </div>}

        {step === 2 && <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {(["minimal", "modern", "classic"] as const).map(t => <button key={t} type="button" aria-pressed={form.preferred_template === t} onClick={() => set("preferred_template", t)} className={cn(choice(form.preferred_template === t), "p-4 space-y-3")}>
            <div className="aspect-[3/4] rounded-lg bg-background border border-border p-3 space-y-1.5" aria-hidden>
              <div className={cn("h-2.5 rounded-sm bg-foreground", t === "classic" ? "w-1/2 mx-auto" : "w-2/3")} />
              {t === "modern" && <div className="h-1 w-full bg-primary rounded-sm" />}
              <div className="h-1.5 w-1/3 rounded-sm bg-muted-foreground/40" />
              {[0, 1, 2].map(i => <div key={i} className="pt-2 space-y-1">
                <div className={cn("h-1.5 w-1/3 rounded-sm", t === "modern" ? "bg-primary" : "bg-foreground/70", t === "classic" && "border-b border-foreground")} />
                <div className="h-1 w-full rounded-sm bg-muted" /><div className="h-1 w-5/6 rounded-sm bg-muted" />
              </div>)}
            </div>
            <span className="block font-semibold capitalize text-center">{t}</span>
          </button>)}
        </div>}

        {step === 3 && <div className="space-y-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input aria-label="Target job title" className="pl-9 h-12" placeholder="Search or type a job title" maxLength={120} value={roleQuery}
              onChange={e => { setRoleQuery(e.target.value); set("target_job_role", e.target.value); }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void next(); } }} /></div>
          <div className="flex flex-wrap gap-2">{roleSuggestions.map(r => <button key={r} type="button" onClick={() => { setRoleQuery(r); set("target_job_role", r); }}
            className={cn("rounded-full border px-3 py-1.5 text-sm", form.target_job_role === r ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card/70 hover:border-primary/50")}>{r}</button>)}</div>
        </div>}

        {step === 4 && <div className="grid gap-3 sm:grid-cols-2">{EXPERIENCE_LEVELS.map(l => <button key={l.value} type="button" aria-pressed={form.experience_level === l.value} onClick={() => set("experience_level", l.value)}
          className={cn(choice(form.experience_level === l.value), "px-5 py-4 font-semibold flex items-center justify-between")}>{l.label}{form.experience_level === l.value && <Check className="size-4 text-primary" />}</button>)}</div>}

        {step === 5 && <JobLocationPicker locations={form.preferred_locations} modes={form.work_modes}
          onLocations={v => set("preferred_locations", v)} onModes={v => set("work_modes", v)} />}

        {notice && <p role="status" className="text-sm text-destructive">{notice}</p>}
        <div className="flex items-center justify-between gap-3 pt-2">
          {step > 1 ? <Button type="button" variant="outline" disabled={busy || uploading} onClick={back}><ArrowLeft />Back</Button> : <span />}
          <Button type="button" disabled={!valid || busy || uploading || Boolean(profile.error)} onClick={() => void next()}>{busy ? "Saving…" : step === TOTAL ? "Finish" : "Continue"}<ArrowRight /></Button>
        </div>
      </section>
    </div>
  </main>;
}
