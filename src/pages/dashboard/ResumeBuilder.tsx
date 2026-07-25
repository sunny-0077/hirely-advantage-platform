import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, FileText, Loader2, ShieldCheck } from "lucide-react";
import { ATS_TEMPLATES, emptyDocument } from "@/lib/resumeBuilder/templates";
import type { ResumeDocument } from "@/lib/resumeBuilder/types";
import { TemplatePicker } from "@/components/dashboard/resumeBuilder/TemplatePicker";
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
import { TOOL_META } from "@/lib/toolMeta";
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

  // Drop any legacy global draft from older builds (cross-user leakage).
  useEffect(() => {
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
  }, []);

  // Hydrate from localStorage so the user never loses their draft (per-user).
  useEffect(() => {
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
      const parsed = JSON.parse(raw) as { doc: ResumeDocument; role?: string };
      if (parsed?.doc?.templateId) {
        setDoc(parsed.doc);
        setRole(parsed.role ?? "");
        setPicking(false);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!doc || !storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify({ doc, role }));
  }, [doc, role, storageKey]);

  const templateMeta = useMemo(
    () => ATS_TEMPLATES.find((t) => t.id === doc?.templateId),
    [doc?.templateId],
  );

  const pickTemplate = (id: string) => {
    setDoc(emptyDocument(id));
    setPicking(false);
  };

  const startOver = () => {
    if (!confirm("Start a new resume? Your current draft will be replaced.")) return;
    if (storageKey) localStorage.removeItem(storageKey);
    setDoc(null);
    setRole("");
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
      exportPdf(doc, fileBase(doc) + ".pdf");
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

  // ---------- Template picker ----------
  if (picking || !doc) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader
          eyebrow="Resume Builder"
          title="Pick an ATS-safe template."
          description="Every template here is single-column, no graphics, no tables — built to be parsed cleanly by every major ATS. Pick one to start; you can switch later without losing content."
          statusLabel="ATS-safe templates only"
          icon={TOOL_META["/app/resume-builder"].icon}
          iconColor={TOOL_META["/app/resume-builder"].color}
        />


        <TemplatePicker value="" onPick={pickTemplate} />

        <div className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-[12.5px] text-amber-200/85 leading-relaxed">
          <span className="font-semibold">Heads up:</span> visually decorative templates with
          photos, sidebars, columns, icons, or progress bars often get rejected by ATS parsers.
          For online job applications, always use one of the ATS-safe templates above.
        </div>
      </div>
    );
  }

  // ---------- Editor ----------
  return (
    <div className="max-w-[1400px] mx-auto">
      <header className="flex items-center gap-3 mb-5 flex-wrap">
        <button
          onClick={startOver}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-foreground/[0.1] bg-foreground/[0.04] text-[12px] text-foreground/70 hover:bg-foreground/[0.08]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Templates
        </button>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-300">
          <ShieldCheck className="w-3 h-3" /> {templateMeta?.name ?? "ATS-safe"}
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Target role (helps AI tailor rewrites)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-9 w-[260px] text-[13px]"
          />
          <button
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
          </button>
          <button
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
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6">
        {/* Left: editor */}
        <div className="space-y-4 min-w-0">
          <PersonalInfoCard doc={doc} setDoc={setDoc} />
          <SectionsEditor doc={doc} setDoc={setDoc} role={role} />
        </div>

        {/* Right: live preview + score + settings */}
        <div className="space-y-4 min-w-0">
          <AtsScorePanel doc={doc} />
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
