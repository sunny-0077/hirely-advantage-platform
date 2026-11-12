import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, FileText, Loader2, ShieldCheck, Save, Plus, RotateCcw } from "lucide-react";
import { ATS_TEMPLATES, emptyDocument } from "@/lib/resumeBuilder/templates";
import type { ResumeDocument } from "@/lib/resumeBuilder/types";
import { ResumeLibrary } from "@/components/dashboard/resumeBuilder/ResumeLibrary";
import { applyLibraryTemplate, mapMasterResume, validateDocument, type LibrarySelection } from "@/lib/resumeBuilder/library";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "react-router-dom";
import { ResumePreview } from "@/components/dashboard/resumeBuilder/ResumePreview";
import { SectionsEditor } from "@/components/dashboard/resumeBuilder/SectionsEditor";
import { PersonalInfoCard } from "@/components/dashboard/resumeBuilder/PersonalInfoCard";
import { SettingsCard } from "@/components/dashboard/resumeBuilder/SettingsCard";
import { AtsScorePanel } from "@/components/dashboard/resumeBuilder/AtsScorePanel";
import { exportPdf } from "@/lib/resumeBuilder/exportPdf";
import { exportDocx } from "@/lib/resumeBuilder/exportDocx";
import { useEntitlements } from "@/hooks/useEntitlements";
import { UpgradePlanDialog } from "@/components/dashboard/UpgradePlanDialog";
import { PageHeader } from "@/components/dashboard/PageHeader";
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

  const useTemplate = async (next: LibrarySelection, useMaster: boolean) => {
    try {
      let source=doc;
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
  if (picking || !doc) return <ResumeLibrary current={doc} onUse={(s,master)=>void useTemplate(s,master)} onContinue={()=>setPicking(false)} />;

  // ---------- Editor ----------
  return (
    <div className="w-full min-w-0">
      <header className="flex items-center gap-3 mb-5 flex-wrap">
        <Button variant="outline" onClick={()=>setPicking(true)}>
          <ArrowLeft className="w-3.5 h-3.5" /> Templates
        </Button>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/25 text-xs text-primary">
          <ShieldCheck className="w-3 h-3" /> {selection?.design.label ?? templateMeta?.name ?? "Resume"}
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Target role (helps AI tailor rewrites)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-9 w-[260px] text-[13px]"
          />
          <Button
            onClick={handlePdf}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-[12.5px] font-medium hover:opacity-90 disabled:opacity-50"
          >
            {exporting === "pdf" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            PDF
          </Button>
          <Button variant="outline"
            onClick={handleDocx}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-foreground/20 bg-foreground/[0.04] text-[12.5px] font-medium text-foreground hover:bg-foreground/[0.08] disabled:opacity-50"
          >
            {exporting === "docx" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            DOCX
          </Button>
        </div>
      </header>

      <section className="border-y border-border py-4 mb-6 flex gap-3 items-end flex-wrap">
        <div className="space-y-2 flex-1 min-w-48"><Label htmlFor="version-name">Resume name</Label><Input id="version-name" value={versionName} maxLength={120} onChange={e=>setVersionName(e.target.value)}/></div>
        <Button disabled={saving} onClick={()=>void saveVersion()}><Save className="size-4"/>{saving?"Saving…":"Save version"}</Button>
        <Button variant="outline" disabled={saving} onClick={()=>void saveVersion(true)}><Plus className="size-4"/>Save as new</Button>
        <Button variant="ghost" onClick={startOver}><RotateCcw className="size-4"/>Start blank</Button>
        <p role="status" className="text-sm text-muted-foreground w-full">{dirty?"Draft changes not saved to your account":"Version saved"}</p>
      </section>
      {selection&&<p className="mb-5 text-sm text-muted-foreground">{selection.blueprint.definition.summaryPrompt}</p>}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6">
        {/* Left: editor */}
        <div className="space-y-4 min-w-0">
          <PersonalInfoCard doc={doc} setDoc={setDoc} />
          <SectionsEditor doc={doc} setDoc={setDoc} role={role} />
        </div>

        {/* Right: live preview + score + settings */}
        <div className="space-y-4 min-w-0">
          
          <SettingsCard doc={doc} setDoc={setDoc} />

          <div className="rounded-2xl border border-border/60 bg-card/40 p-3 overflow-auto">
            <div className="text-[10.5px] uppercase tracking-[0.18em] text-foreground/45 mb-2 px-1">
              Live preview
            </div>
            <div
              className="origin-top-left"
              style={{ transform: "scale(0.78)", width: "calc(100% / 0.78)" }}
            >
              <ResumePreview doc={doc} />
            </div>
          </div>
        </div>
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
