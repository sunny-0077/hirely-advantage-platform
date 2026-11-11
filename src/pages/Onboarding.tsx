import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogoLockup } from "@/components/landing/Logo";
import { toast } from "sonner";
import { personalSchema, careerSchema, masterResumeSchema } from "@/lib/onboarding";

const STEPS = ["Personal information", "Career preferences", "Master resume"];
const EMPTY = { full_name: "", country: "", preferred_currency: "", preferred_location: "", target_job_role: "", experience_level: "", preferred_job_location: "", employment_preference: "", master_resume_text: "" };

export default function Onboarding() {
  const { user, loading, recovering } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const initialized = useRef<string | null>(null);
  const profile = useQuery({ queryKey: ["onboarding-profile", user?.id], enabled: Boolean(user), queryFn: async () => {
    if (!user) return null;
    const { data, error } = await supabase.from("profiles").select("full_name,country,preferred_currency,preferred_location,target_job_role,experience_level,preferred_job_location,employment_preference,master_resume_text,onboarding_step,onboarding_completed").eq("user_id", user.id).single();
    if (error) throw error;
    return data;
  } });
  useEffect(() => {
    if (!profile.data || !user || initialized.current === user.id) return;
    const data = profile.data;
    setForm({ full_name: data.full_name ?? "", country: data.country ?? "", preferred_currency: data.preferred_currency ?? "", preferred_location: data.preferred_location ?? "", target_job_role: data.target_job_role ?? "", experience_level: data.experience_level ?? "", preferred_job_location: data.preferred_job_location ?? "", employment_preference: data.employment_preference ?? "", master_resume_text: data.master_resume_text ?? "" });
    setStep(data.onboarding_step);
    initialized.current = user.id;
  }, [profile.data, user]);
  const field = (key: keyof typeof EMPTY, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  if (loading || (user && profile.isPending)) return <main className="p-10" role="status">Loading account…</main>;
  if (!user) return <Navigate to="/auth?mode=signup" replace />;
  if (recovering) return <Navigate to="/reset-password" replace />;
  if (profile.data?.onboarding_completed) return <Navigate to="/app/home" replace />;
  async function save(advance: boolean, skipResume = false) {
    if (!user) return;
    setBusy(true);
    setNotice("");
    try {
      const personal = personalSchema.parse(form);
      const career = step >= 2 ? careerSchema.parse(form) : null;
      const resume = step === 3 ? masterResumeSchema.parse(form.master_resume_text) : undefined;
      const { data, error } = await supabase.from("profiles").update({
        ...personal, display_name: personal.full_name, ...(career ?? {}),
        ...(resume !== undefined && !skipResume ? { master_resume_text: resume } : {}),
        onboarding_step: advance ? Math.min(3, step + 1) : step,
        onboarding_completed: advance && step === 3,
      })
        .eq("user_id", user.id).select("user_id").maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Your profile isn't ready yet. Refresh and try again.");
      await queryClient.invalidateQueries({ queryKey: ["workspace", user.id] });
      if (advance && step === 3) { await queryClient.invalidateQueries({ queryKey: ["workspace-home", user.id] }); navigate("/app/home", { replace: true }); }
      else if (advance) setStep(previous => previous + 1);
      else setNotice("Progress saved. You can return to finish later.");
    } catch (error) { setNotice(error && typeof error === "object" && "issues" in error ? "Please complete all fields in this step." : "Couldn't save your profile. Please try again."); }
    finally { setBusy(false); }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    try {
      const { MAX_FILE_BYTES, ACCEPTED_EXTS, extractResumeText } = await import("@/lib/resumeParser");
      if (file.size > MAX_FILE_BYTES) throw new Error("Choose a file under 5 MB.");
      if (!ACCEPTED_EXTS.some(extension => file.name.toLowerCase().endsWith(extension)) || (file.type && !["application/pdf", "text/plain"].includes(file.type))) throw new Error("Choose a PDF or TXT resume.");
      const text = masterResumeSchema.parse(await extractResumeText(file));
      if (!text) throw new Error("No readable text found. Paste your resume instead.");
      field("master_resume_text", text);
      toast.success("Resume imported. Save to keep it.");
    } catch (error) { toast.error(error instanceof Error && !('issues' in error) ? error.message : "Couldn't import this resume. Paste the text instead."); }
    finally { setImporting(false); }
  }
  const selector = (id: keyof typeof EMPTY, label: string, options: { value: string; label: string }[]) => <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Select value={form[id]} onValueChange={value => field(id, value)}><SelectTrigger id={id}><SelectValue placeholder="Select…" /></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
  const textField = (id: keyof typeof EMPTY, label: string, maxLength: number) => <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} required maxLength={maxLength} value={form[id]} onChange={event => field(id, event.target.value)} /></div>;
  return <main className="min-h-screen bg-background px-5 py-10 md:py-14 flex justify-center items-start">
    <div className="w-full max-w-xl space-y-8">
      <LogoLockup size="text-2xl" />
      <div><p className="text-sm text-muted-foreground">Step {step} of 3</p><h1 className="text-3xl font-extrabold mt-2">{STEPS[step - 1]}</h1></div>
      <ol className="grid grid-cols-3 gap-3" aria-label="Onboarding progress">{STEPS.map((label, index) => <li key={label} className={`border-t-2 pt-3 text-xs ${index + 1 <= step ? "border-primary text-foreground" : "border-border text-muted-foreground"}`} aria-current={index + 1 === step ? "step" : undefined}>{index + 1 < step ? <Check className="size-4 mb-1" /> : null}{label}</li>)}</ol>
      {profile.error && <p role="alert" className="text-destructive">Couldn't load your account. <Button variant="link" onClick={() => profile.refetch()}>Retry</Button></p>}
      <form onSubmit={event => { event.preventDefault(); void save(true); }} className="space-y-6">
        <fieldset disabled={busy || importing || Boolean(profile.error)} className="space-y-5">
          {step === 1 && <>{textField("full_name", "Full name", 100)}{textField("country", "Country", 100)}{selector("preferred_currency", "Preferred currency", ["INR", "USD", "EUR", "GBP", "CAD", "AUD", "SGD", "AED"].map(value => ({ value, label: value })))}{textField("preferred_location", "Preferred location", 200)}</>}
          {step === 2 && <>{textField("target_job_role", "Target job role", 200)}{selector("experience_level", "Experience level", [{ value: "student", label: "Student / no experience" }, { value: "entry", label: "Entry level" }, { value: "mid", label: "Mid level" }, { value: "senior", label: "Senior level" }])}{textField("preferred_job_location", "Preferred job location", 200)}{selector("employment_preference", "Employment preference", ["Full-time", "Internship", "Contract", "Remote"].map(value => ({ value, label: value })))}</>}
          {step === 3 && <><p className="text-muted-foreground text-sm">Your Master Resume is the foundation of Hirely. Resume tailoring, cover letters, and interview guides use it to reflect your real experience. Add it now or finish later in My profile.</p><div className="space-y-2"><Label htmlFor="master_resume_text">Master resume text</Label><Textarea id="master_resume_text" rows={10} maxLength={50000} value={form.master_resume_text} onChange={event => field("master_resume_text", event.target.value)} /></div><Label htmlFor="resume-import" className="flex items-center gap-2"><Upload className="size-4" />Import PDF or TXT (up to 5 MB, 3 PDF pages)</Label><Input id="resume-import" type="file" accept=".pdf,.txt" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ""; }} />{importing && <p role="status">Reading resume…</p>}<p className="text-sm text-muted-foreground">You can skip this step. AI generation will require a Master Resume before you start.</p></>}
        </fieldset>
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
        <div className="flex flex-wrap gap-3">
          {step > 1 && <Button type="button" variant="outline" disabled={busy || importing} onClick={() => setStep(previous => previous - 1)}><ArrowLeft />Back</Button>}
          <Button type="button" variant="secondary" disabled={busy || importing || Boolean(profile.error)} onClick={() => void save(false)}>Save progress</Button>
          <Button type="submit" disabled={busy || importing || Boolean(profile.error)}>{busy ? "Saving…" : step === 3 ? "Open My Workspace" : "Save and continue"}<ArrowRight /></Button>
          {step === 3 && <Button type="button" variant="link" disabled={busy || importing} onClick={() => void save(true, true)}>Set up resume later</Button>}
        </div>
      </form>
      <Button variant="link" disabled={busy} onClick={async () => { const { error } = await supabase.auth.signOut(); if (error) toast.error("Couldn't sign out. Try again."); else queryClient.clear(); }}>Sign out</Button>
    </div>
  </main>;
}
