import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, FileText, Loader2, Save, Plus, RotateCcw, MoreHorizontal } from "lucide-react";
import { ATS_TEMPLATES, emptyDocument } from "@/lib/resumeBuilder/templates";
import type { ResumeDocument } from "@/lib/resumeBuilder/types";
import { ResumeLibrary } from "@/components/dashboard/resumeBuilder/ResumeLibrary";
import { applyLibraryTemplate, mapMasterResume, validateDocument, type LibrarySelection } from "@/lib/resumeBuilder/library";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSearchParams } from "react-router-dom";
import { FittedResumePreview } from "@/components/dashboard/resumeBuilder/ResumePreview";
import { ResumeToolbar } from "@/components/dashboard/resumeBuilder/ResumeToolbar";
import { roleExample } from "@/lib/resumeBuilder/examples";
import { loadOccupationExample } from "@/lib/resumeBuilder/occupationExamples";
import { classifyRole, resolvedLayout, styleLabel } from "@/lib/resumeBuilder/visual";
import { SectionsEditor } from "@/components/dashboard/resumeBuilder/SectionsEditor";
import { PersonalInfoCard } from "@/components/dashboard/resumeBuilder/PersonalInfoCard";
import { exportPdf } from "@/lib/resumeBuilder/exportPdf";
import { exportDocx } from "@/lib/resumeBuilder/exportDocx";
import { useEntitlements } from "@/hooks/useEntitlements";
import { UpgradePlanDialog } from "@/components/dashboard/UpgradePlanDialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const LEGACY_KEY = "hirely.resumeBuilder.draft.v1";
const storageKeyFor = (uid?: string) =>
  uid ? `hirely.resumeBuilder.draft.v2.${uid}` : null;

const ResumeBuilder = () => {
  const ent = useEntitlements();
  const { user } = useAuth();
  const storageKey = storageKeyFor(user?.id);
  const [doc, setDoc] = useState<ResumeDocument | null>(null);
  const [picking, setPicking] = useState(true);
  const [role, setRole] = useState("");
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const requestedVersion = params.get("version");
  const [selection, setSelection] = useState<LibrarySelection | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [versionName, setVersionName] = useState("Untitled resume");
  const [saving, setSaving] = useState(false);
  const [editorView, setEditorView] = useState<"edit" | "preview">("edit");
  const [savedContent, setSavedContent] = useState("");
  const [metadata, setMetadata] = useState<{title_id:string|null;level_id:string|null;design_id:string|null;blueprint_id:string|null;design_version:number;blueprint_version:number}|null>(null);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [versionError, setVersionError] = useState(false);
  const dirty = !!doc && JSON.stringify(doc) !== savedContent;
  useEffect(() => { const listener=(e:BeforeUnloadEvent)=>{if(dirty)e.preventDefault();};window.addEventListener("beforeunload",listener);return()=>window.removeEventListener("beforeunload",listener); }, [dirty]);
  useEffect(() => {
    const id=requestedVersion; if(!id || !user)return;
    let active=true; setLoadingVersion(true); setVersionError(false);
    supabase.from("resume_versions").select("*").eq("id",id).eq("user_id",user.id).single().then(({data,error})=>{
      if(!active)return;
      try { if(error||!data)throw error; const next=validateDocument(data.document);setDoc(next);setSelection(null);setRole("");setVersionId(data.id);setRevision(data.revision);setVersionName(data.name);setSavedContent(JSON.stringify(next));setMetadata(data);setPicking(false); }
      catch {setVersionError(true);toast.error("Couldn't open this resume version.");} finally {setLoadingVersion(false);}
    });return()=>{active=false;};
  },[requestedVersion,user?.id]);

  // Drop any legacy global draft from older builds (cross-user leakage).
  useEffect(() => {
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
  }, []);

  // Hydrate from localStorage so the user never loses their draft (per-user).
  useEffect(() => {
    if (requestedVersion) return;
    if (!storageKey) {
      // No user yet — make sure we don't show stale state from a previous user.
      setDoc(null);
      setRole("");
      setPicking(true);
      return;
    }
    const raw = localStorage.getItem(storageKey);
    const presetTemplate = params.get("template");
    if (!raw && presetTemplate) {
      // Arrived from onboarding: start with the chosen layout and target role.
      setDoc(emptyDocument(presetTemplate));
      setRole((params.get("role") ?? "").slice(0, 120));
      setPicking(false);
      return;
    }
    if (!raw) {
      setDoc(null);
      setRole("");
      setPicking(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { doc: ResumeDocument; role?: string; selection?: LibrarySelection; versionId?: string; revision?:number; versionName?:string; metadata?:typeof metadata };
      if (parsed?.doc?.templateId) {
        setDoc(validateDocument(parsed.doc));
        setSelection(parsed.selection ?? null);
        setVersionId(parsed.versionId ?? null);setRevision(parsed.revision ?? 0);setVersionName(parsed.versionName ?? "Untitled resume");setMetadata(parsed.metadata ?? null);
        setRole(parsed.role ?? "");
        setPicking(false);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey, requestedVersion]);

  useEffect(() => {
    if (!doc || !storageKey || loadingVersion || versionError || (requestedVersion && versionId !== requestedVersion)) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ doc, role, selection, versionId, revision, versionName, metadata })); } catch { toast.error("Browser draft storage is full. Save a version to keep your work."); }
  }, [doc, role, storageKey, selection, versionId, revision, versionName, metadata, loadingVersion, versionError, requestedVersion]);

  const templateMeta = useMemo(
    () => ATS_TEMPLATES.find((t) => t.id === doc?.templateId),
    [doc?.templateId],
  );

  const useTemplate = async (next: LibrarySelection, useMaster: boolean, withExample = false) => {
    try {
      let source=withExample ? roleExample(next.title, next.design.definition.archetype ?? classifyRole({title:next.title,occupationTitle:next.occupationTitle,industryId:next.industryId,blueprintId:next.blueprint.id,levelId:next.levelId}), next.occupationTitle, await loadOccupationExample(next.occupationId)) : doc;
      if(!source && useMaster) {
        if(!user)return;
        const {data,error}=await supabase.from("profiles").select("master_resume_json").eq("user_id",user.id).single();
        if(error)throw error;
        source=mapMasterResume(data.master_resume_json);
      }
      setDoc(applyLibraryTemplate(source??emptyDocument("classic-ats"),next));setSelection(next);setRole(next.title);setPicking(false);
    }catch {toast.error("Couldn't load your Master Resume. Your draft is unchanged.");}
  };
  const saveVersion = async (copy=false) => {
    if(!doc||!user||saving)return;
    const name=versionName.trim();if(!name || name.length>120){toast.error("Enter a resume name, up to 120 characters.");return;}
    setSaving(true);
    try {
      const document=validateDocument(doc);
      const linked=selection?{title_id:selection.titleId,level_id:selection.levelId,design_id:selection.design.id,blueprint_id:selection.blueprint.id,design_version:selection.design.version,blueprint_version:selection.blueprint.version}:metadata;
      const payload={user_id:user.id,name,document:document as never,...linked};
      const result=versionId&&!copy ? await supabase.from("resume_versions").update({...payload,revision:revision+1}).eq("id",versionId).eq("user_id",user.id).eq("revision",revision).select("id,revision").maybeSingle() : await supabase.from("resume_versions").insert(payload).select("id,revision").single();
      if(result.error)throw result.error;
      if(!result.data){toast.error("A newer version was saved elsewhere. Save as a new version to keep these edits.");return;}
      setVersionId(result.data.id);setRevision(result.data.revision);setSavedContent(JSON.stringify(doc));toast.success(copy?"New resume version saved":"Resume version saved");
      if(requestedVersion && requestedVersion !== result.data.id)setParams({version:result.data.id},{replace:true});
    }catch {toast.error("Couldn't save. Your edits remain in this draft.");}finally{setSaving(false);}
  };

  const startOver = () => {
    if (!confirm("Start a new resume? Your current draft will be replaced.")) return;
    if (storageKey) localStorage.removeItem(storageKey);
    setDoc(null);
    setRole("");
    setSelection(null);setVersionId(null);setRevision(0);setMetadata(null);setVersionName("Untitled resume");
    setSavedContent("");setParams({}, {replace:true});
    setPicking(true);
  };

  const requireExportAccess = () => {
    if (ent.loading) return false;
    if (!ent.unlocked("resume_export")) {
      setUpgradeOpen(true);
      return false;
    }
    return true;
  };

  const handlePdf = async () => {
    if (!doc) return;
    if (!requireExportAccess()) return;
    setExporting("pdf");
    try {
      await exportPdf(doc, fileBase(doc) + ".pdf");
      toast.success("PDF downloaded.");
    } catch (e) {
      console.error(e);
      toast.error("PDF export failed.");
    } finally {
      setExporting(null);
    }
  };

  const handleDocx = async () => {
    if (!doc) return;
    if (!requireExportAccess()) return;
    setExporting("docx");
    try {
      await exportDocx(doc, fileBase(doc) + ".docx");
      toast.success("DOCX downloaded.");
    } catch (e) {
      console.error(e);
      toast.error("DOCX export failed.");
    } finally {
      setExporting(null);
    }
  };

  if(loadingVersion)return <p role="status">Opening resume version…</p>;
  if(versionError)return <div><p role="alert">Couldn't open this resume version.</p><Button onClick={()=>window.location.reload()}>Retry</Button><Button variant="outline" onClick={()=>{setVersionError(false);setPicking(true);}}>Browse templates</Button></div>;
  if (picking || !doc) return <ResumeLibrary current={doc} onUse={(s,master,example)=>void useTemplate(s,master,example)} onContinue={()=>setPicking(false)} />;

  // ---------- Editor ----------
  return (
    <div className="mx-auto flex h-[calc(100dvh-104px)] md:h-[calc(100dvh-40px)] w-full max-w-[1120px] min-w-0 flex-col overflow-hidden" aria-label="Resume editor workspace">
      <header className="flex shrink-0 items-center gap-2 border-b border-border pb-3">
        <Button variant="ghost" size="icon" title="Browse templates" aria-label="Browse templates" onClick={()=>setPicking(true)}><ArrowLeft className="size-4"/></Button>
        <div className="min-w-0 flex-1">
          <Input aria-label="Resume name" value={versionName} maxLength={120} onChange={e=>setVersionName(e.target.value)} className="h-8 border-transparent bg-transparent px-1 font-semibold shadow-none"/>
          <p role="status" className="truncate px-1 text-xs text-muted-foreground">{dirty?"Unsaved changes":"Version saved"} · {styleLabel(resolvedLayout(doc))}</p>
        </div>
        <Button size="sm" disabled={saving} onClick={()=>void saveVersion()}><Save className="size-4"/><span className="hidden sm:inline">{saving?"Saving…":"Save"}</span></Button>
        <Button size="sm" disabled={exporting!==null} onClick={handlePdf}>{exporting==="pdf"?<Loader2 className="size-4 animate-spin"/>:<Download className="size-4"/>}PDF</Button>
        <Popover><PopoverTrigger asChild><Button variant="outline" size="icon" aria-label="More resume actions"><MoreHorizontal className="size-4"/></Button></PopoverTrigger><PopoverContent align="end" className="w-72 space-y-3">
          <div className="space-y-1"><Label htmlFor="target-role">Target role</Label><Input id="target-role" value={role} onChange={e=>setRole(e.target.value)} placeholder="Target role"/></div>
          <Button variant="ghost" className="w-full justify-start" disabled={saving} onClick={()=>void saveVersion(true)}><Plus className="size-4"/>Save as new version</Button>
          <Button variant="ghost" className="w-full justify-start" disabled={exporting!==null} onClick={handleDocx}><FileText className="size-4"/>Download DOCX</Button>
          <Button variant="ghost" className="w-full justify-start" onClick={startOver}><RotateCcw className="size-4"/>Start blank</Button>
        </PopoverContent></Popover>
      </header>
      <ResumeToolbar doc={doc} setDoc={setDoc} onExport={()=>void handlePdf()} exporting={exporting !== null} />
      {doc.presentation?.example && <p role="status" className="shrink-0 border-b border-border py-2 text-xs text-warning">Illustrative example · not your career facts</p>}
      <div className="flex shrink-0 gap-1 border-b border-border py-2 lg:hidden" role="group" aria-label="Editor view">
        <Button variant={editorView==="edit"?"secondary":"ghost"} size="sm" aria-pressed={editorView==="edit"} onClick={()=>setEditorView("edit")}>Edit</Button>
        <Button variant={editorView==="preview"?"secondary":"ghost"} size="sm" aria-pressed={editorView==="preview"} onClick={()=>setEditorView("preview")}>Preview</Button>
      </div>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(300px,440px)_minmax(0,1fr)]">
        <section aria-label="Resume fields" className={`${editorView==="edit"?"flex":"hidden"} min-h-0 min-w-0 flex-col lg:flex lg:border-r lg:border-border`}>
          <div className="shrink-0 py-3 text-sm font-semibold">Resume content</div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-4 pr-2 lg:pr-4">
            <PersonalInfoCard doc={doc} setDoc={setDoc} />
            <SectionsEditor doc={doc} setDoc={setDoc} role={role} />
          </div>
        </section>
        <section aria-label="Live resume preview" className={`${editorView==="preview"?"flex":"hidden"} min-h-0 min-w-0 flex-col bg-surface lg:flex`}>
          <div className="flex shrink-0 items-center justify-between px-4 py-3 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Live preview</span><span>A4 · 210 × 297 mm</span></div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 sm:px-5">
            <div className="mx-auto h-full max-w-[580px]"><FittedResumePreview doc={doc} fitPage /></div>
          </div>
        </section>
      </div>

      <UpgradePlanDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentPlan={ent.plan}
        feature="resume_export"
      />
    </div>
  );
};

function fileBase(doc: ResumeDocument) {
  const name = doc.content.personal.name?.trim().replace(/\s+/g, "_") || "resume";
  return `${name}_${doc.templateId}`;
}

export default ResumeBuilder;
