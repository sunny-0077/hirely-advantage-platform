import { useRef, useState } from "react";
import { Upload, Loader2, Plus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { masterResumeSchema, newExperience, newEducation, newProject, newCertification, newExtra, type MasterResume } from "@/lib/masterResume";
import { validateImportFile, mapResumeText, importFields, updateImportField, confirmImport } from "@/lib/resumeImport";

export function ResumeImporter({ existing, disabled, onConfirm }: { existing: MasterResume; disabled: boolean; onConfirm: (resume: MasterResume) => Promise<boolean> }) {
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false), [stage, setStage] = useState<"uploading" | "extracting" | "review" | "saving" | "success">("review");
  const [draft, setDraft] = useState<MasterResume | null>(null), [selected, setSelected] = useState<Set<string>>(new Set());
  const [unassigned, setUnassigned] = useState(""), [text, setText] = useState(""), [filename, setFilename] = useState(""), [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const cancel = () => { controller.current?.abort(); controller.current = null; setOpen(false); setDraft(null); setError(""); setText(""); setUnassigned(""); };
  async function upload(file: File) {
    setError("");
    try { validateImportFile(file); } catch (e) { setError(e instanceof Error ? e.message : "Select another file."); return; }
    setFilename(file.name); setDraft(null); setOpen(true); setStage("uploading");
    const abort = new AbortController(); controller.current = abort;
    try {
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError || !data.session) throw new Error("Please sign in again.");
      if (abort.signal.aborted) return;
      setStage("extracting");
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-master-resume`, {
        method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/octet-stream", "x-resume-filename": encodeURIComponent(file.name) }, body: file, signal: abort.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn't read this resume.");
      if (typeof result.text !== "string" || result.text.length > 50000) throw new Error("Couldn't read this resume.");
      const mapped = mapResumeText(result.text);
      setDraft(mapped.resume); setText(result.text); setUnassigned(mapped.unassigned.join("\n"));
      // No automatic selection: every replacement/addition needs a deliberate choice.
      setSelected(new Set()); setStage("review");
    } catch (e) {
      if (abort.signal.aborted) return;
      setStage("review"); setError(e instanceof Error ? e.message : "Couldn't import this document.");
    }
  }
  async function confirm() {
    if (!draft || !selected.size) return;
    setError("");
    const validation = masterResumeSchema.safeParse(draft);
    if (!validation.success) { setError(validation.error.issues.map(i => `${i.path.join(" · ")}: ${i.message}`).join("; ")); return; }
    try {
      const result = confirmImport(existing, validation.data, selected);
      setStage("saving");
      if (await onConfirm(result)) { setStage("success"); setDraft(null); setText(""); setUnassigned(""); }
      else { setStage("review"); setError("Nothing was imported. Your previous saved resume is unchanged."); }
    } catch (e) { setStage("review"); setError(e instanceof Error ? e.message : "Review the selected fields before saving."); }
  }
  const busy = stage === "uploading" || stage === "extracting" || stage === "saving";
  return <>
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <Button variant="outline" disabled={disabled} onClick={() => input.current?.click()}><Upload className="size-4" />Import Resume</Button>
      <span className="text-sm text-muted-foreground">PDF or DOCX · up to 5 MB · PDF up to 3 pages · no credits</span>
      <Input ref={input} type="file" className="hidden" accept=".pdf,.docx" aria-label="Select resume to import" onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file); }} />
    </div>
    {error && !open && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
    <Dialog open={open} onOpenChange={v => { if (!v && stage !== "saving") cancel(); }}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{stage === "success" ? "Resume imported" : "Review imported resume"}</DialogTitle><DialogDescription>{filename}</DialogDescription></DialogHeader>
        {busy && <p role="status" className="flex items-center gap-2 py-6"><Loader2 className="size-5 animate-spin" />{stage === "uploading" ? "Uploading securely…" : stage === "extracting" ? "Extracting document text…" : "Saving selected information…"}</p>}
        {error && <p role="alert" className="text-sm text-destructive whitespace-pre-wrap">{error}</p>}
        {stage === "success" ? <div className="space-y-4"><p className="flex gap-2"><CheckCircle2 className="size-5 text-primary" />Selected information is saved in your Master Resume.</p><Button onClick={cancel}>Done</Button></div> : stage === "review" && draft ? <>
          <p className="text-sm text-muted-foreground">Select only information you want to save. Checked contact, summary and skill fields replace those fields; checked work, education, project and certification entries are added. Unchecked and missing information stays unchanged. Any unsaved changes already in your editor are saved too. Legacy pasted text stays unchanged. No AI is used.</p>
          <div className="space-y-4">
            {importFields(draft, true).map(field => <div key={field.path} className="grid grid-cols-[20px_1fr] gap-3">
              <Checkbox id={`include-${field.path}`} className="mt-1" checked={selected.has(field.path)} aria-label={`Import ${field.label}`} onCheckedChange={v => setSelected(prev => { const next = new Set(prev); if (v) next.add(field.path); else next.delete(field.path); return next; })} />
              <div className="space-y-1.5"><Label htmlFor={`review-${field.path}`}>{field.label}</Label>
                {typeof field.value === "boolean" ? <Checkbox id={`review-${field.path}`} checked={field.value} onCheckedChange={v => setDraft(updateImportField(draft, field, Boolean(v)))} /> : <Textarea id={`review-${field.path}`} rows={field.list || String(field.value).length > 150 ? 3 : 1} value={String(field.value)} onChange={e => setDraft(updateImportField(draft, field, e.target.value))} />}
              </div>
            </div>)}
          </div>
          <div className="flex flex-wrap gap-2">{([['Experience', 'experience', newExperience], ['Education', 'education', newEducation], ['Project', 'projects', newProject], ['Certification', 'certifications', newCertification], ['Language', 'additional', () => newExtra('language')], ['Award', 'additional', () => newExtra('award')], ['Other information', 'additional', () => newExtra('other')]] as const).map(([label, key, factory]) => <Button key={label} size="sm" variant="outline" onClick={() => setDraft(prev => { if (!prev) return prev; const next = structuredClone(prev); (next[key] as unknown[]).push(factory()); return next; })}><Plus className="size-4" />{label}</Button>)}</div>
          <div className="space-y-2"><Label htmlFor="unassigned-import">Needs manual assignment</Label><Textarea id="unassigned-import" rows={5} value={unassigned} onChange={e => setUnassigned(e.target.value)} /><p className="text-xs text-muted-foreground">Copy unclear information into the appropriate fields above and check those fields. This area is not saved automatically.</p></div>
          <details><summary className="cursor-pointer text-sm font-medium">Original extracted text</summary><pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words text-sm font-sans">{text}</pre></details>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4"><Button variant="outline" onClick={cancel}>Cancel and keep current resume</Button><Button disabled={!selected.size} onClick={confirm}>Confirm import and save</Button></div>
        </> : !busy && <Button variant="outline" onClick={cancel}>Close — enter details manually</Button>}
        {(stage === "uploading" || stage === "extracting") && <Button variant="outline" onClick={cancel}>Cancel</Button>}
      </DialogContent>
    </Dialog>
  </>;
}