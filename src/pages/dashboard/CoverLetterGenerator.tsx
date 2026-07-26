import { useEffect, useState } from "react";
import {
  Sparkles,
  Loader2,
  Upload,
  Download,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Maximize2,
  Mail,
} from "lucide-react";
import { EmptyState, PreviewCoverLetter } from "@/components/dashboard/EmptyState";
import { toast } from "sonner";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { UpgradePlanDialog } from "@/components/dashboard/UpgradePlanDialog";
import { LetterSheet } from "@/components/dashboard/cover-letter/LetterSheet";
import { FullscreenToolbar } from "@/components/dashboard/cover-letter/FullscreenToolbar";
import { DraftingOverlay } from "@/components/dashboard/cover-letter/DraftingOverlay";
import { CoverLetterLibrary } from "@/components/dashboard/cover-letter/CoverLetterLibrary";
import { LetterStats } from "@/components/dashboard/cover-letter/LetterStats";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  emptyDoc,
  extractBody,
  guessSalutation,
  todayLong,
  toTitleCaseName,
  TONES,
  type LetterDoc,
  type Tone,
  type TypoSettings,
} from "@/lib/coverLetter/types";
import { parseJobDescription, parseResumeContact } from "@/lib/coverLetter/parse";
import {
  copyLetter as copyLetterUtil,
  downloadDocx as downloadDocxUtil,
  downloadPdf as downloadPdfUtil,
  downloadTxt as downloadTxtUtil,
} from "@/lib/coverLetter/letterExport";

const CoverLetterGenerator = () => {
  const { user } = useAuth();
  const ent = useEntitlements();
  const cleanExports = ent.unlocked("cover_letter_clean");
  const canGenerate = ent.can("cover_letters");
  const [jd, setJd] = useState("");
  const [tone, setTone] = useState<Tone>("confident");
  const [pages, setPages] = useState<1 | 2 | 3>(1);
  const [generating, setGenerating] = useState(false);
  const [hasLetter, setHasLetter] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [doc, setDoc] = useState<LetterDoc>(emptyDoc());
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [libraryKey, setLibraryKey] = useState(0);
  const [typo, setTypo] = useState<TypoSettings>({
    font: "times",
    fontSize: 14,
    lineHeight: 1.7,
    align: "left",
    bold: false,
    italic: false,
  });
  const updateTypo = <K extends keyof TypoSettings>(key: K, value: TypoSettings[K]) =>
    setTypo((t) => ({ ...t, [key]: value }));

  const [resumeId, setResumeId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("resumes")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      setResumeId(data.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Esc closes fullscreen + lock body scroll while open
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const update = <K extends keyof LetterDoc>(key: K, value: LetterDoc[K]) =>
    setDoc((d) => ({ ...d, [key]: value }));

  const handleFile = async (file: File) => {
    if (!file) return;
    const isText =
      file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md");
    if (!isText) {
      toast.error("Please upload a .txt or .md file (or paste the JD).");
      return;
    }
    const text = await file.text();
    setJd(text.slice(0, 12000));
    toast.success("Job description loaded.");
  };

  const generate = async () => {
    if (!user) {
      toast.error("Please sign in first.");
      return;
    }
    if (!canGenerate) {
      setShowUpgrade(true);
      return;
    }
    if (jd.trim().length < 40) {
      toast.error("Paste a job description first (at least a paragraph).");
      return;
    }
    setGenerating(true);
    try {
      let senderFill = {
        senderName: "",
        senderEmail: "",
        senderPhone: "",
        senderLocation: "",
      };
      if (resumeId) {
        const { data: resumeRow } = await supabase
          .from("resumes")
          .select("raw_text")
          .eq("id", resumeId)
          .maybeSingle();
        if (resumeRow?.raw_text) {
          const parsed = parseResumeContact(resumeRow.raw_text);
          senderFill = {
            senderName: parsed.name || "",
            senderEmail: parsed.email || "",
            senderPhone: parsed.phone || "",
            senderLocation: parsed.location || "",
          };
        }
      }
      const jdParsed = parseJobDescription(jd);
      const companyForRequest = (doc.companyName.trim() || jdParsed.company || "").trim();
      // Extract role from JD using common patterns; fall back to "this role".
      const roleFromJd =
        jd.match(/\b(?:hiring|seeking|looking for|recruiting|the position of|role of|position:|title:)\s+(?:a |an |our )?([A-Z][A-Za-z0-9 /+\-]{2,60}?)(?:\s+(?:to|who|with|at|in|for|role|position)\b|[.\n])/)
          ?.[1]
          ?.trim() ||
        jd.split("\n").map((l) => l.trim()).find((l) =>
          /^[A-Z][A-Za-z0-9 /+\-]{2,60}$/.test(l) &&
          /(engineer|developer|analyst|manager|designer|scientist|intern|consultant|architect|lead|director|specialist|associate)/i.test(l),
        );
      const roleForRequest = (roleFromJd || "").trim();

      const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
        body: {
          company: companyForRequest, // empty string is fine — backend treats as "not provided"
          role: roleForRequest,
          tone,
          length: pages === 3 ? "three_page" : pages === 2 ? "two_page" : "one_page",
          job_description: jd.trim(),
          hiring_manager: doc.hiringManager.trim() || jdParsed.hiringManager || undefined,
          resume_id: resumeId ?? undefined,
        },
      });
      const quotaCode =
        (data as { code?: string })?.code ||
        (error as { context?: { code?: string } } | null)?.context?.code;
      if (quotaCode === "OVER_QUOTA") {
        setShowUpgrade(true);
        ent.refresh();
        return;
      }
      if (error) throw new Error(error.message || "Generation failed");
      const errMsg = (data as { error?: string })?.error;
      if (errMsg) throw new Error(errMsg);
      const letterPayload = (data as {
        letter?: { full_letter?: string; match_score?: number | null };
      })?.letter;
      const full = letterPayload?.full_letter ?? "";
      if (!full) throw new Error("No letter returned");
      setMatchScore(typeof letterPayload?.match_score === "number" ? letterPayload.match_score : null);

      const hiringManager = doc.hiringManager || jdParsed.hiringManager || "";
      const salutation = guessSalutation(hiringManager);
      const body = extractBody(full, salutation);

      setDoc((d) => ({
        ...d,
        senderName: senderFill.senderName ? toTitleCaseName(senderFill.senderName) : d.senderName,
        senderEmail: senderFill.senderEmail || d.senderEmail,
        senderPhone: senderFill.senderPhone || d.senderPhone,
        senderLocation: senderFill.senderLocation || d.senderLocation,
        companyName: d.companyName || jdParsed.company || "",
        hiringManager: toTitleCaseName(d.hiringManager || jdParsed.hiringManager || ""),
        salutation,
        body,
        signOff: d.signOff || "Sincerely,",
        date: d.date || todayLong(),
      }));
      setHasLetter(true);
      setLibraryKey((k) => k + 1);
      ent.refresh();
      toast.success("Cover letter ready — edit before downloading.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    setHasLetter(false);
    setMatchScore(null);
    setJd("");
    setDoc((d) => ({
      ...emptyDoc(),
      senderName: d.senderName,
      senderEmail: d.senderEmail,
      senderPhone: d.senderPhone,
      senderLocation: d.senderLocation,
    }));
  };

  const onCopy = async () => {
    try {
      await copyLetterUtil(doc, cleanExports);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  const onDownloadPdf = () => {
    downloadPdfUtil(doc, typo, cleanExports);
  };

  const onDownloadDocx = async () => {
    const res = await downloadDocxUtil(doc, typo, cleanExports);
    if (!res.ok && res.reason) toast.error(res.reason);
  };

  const onDownloadTxt = () => {
    downloadTxtUtil(doc, cleanExports);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Cover Letter Generator"
        title="One letter, perfectly tuned."
        description="Paste or upload a job description, fill in your details, pick a tone, and we'll draft a properly structured cover letter you can edit before downloading."
        statusLabel="Tailored to a specific role"
      />


      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: input */}
        <SectionCard className="lg:col-span-5 p-0 overflow-hidden">
          <div className="border-t border-foreground/[0.06] px-5 sm:px-6 pt-4 pb-2">
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              Job description
            </p>
            <p className="mt-1 text-[12.5px] text-foreground/55 tracking-tight">
              Paste the JD or upload a .txt file.
            </p>
          </div>
          <div className="px-5 sm:px-6 py-3 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                  JD
                </label>
                <label
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[11.5px] text-foreground/60 cursor-pointer hover:text-foreground transition-colors",
                    generating && "pointer-events-none opacity-50",
                  )}
                >
                  <Upload className="w-3 h-3" />
                  Upload .txt
                  <input
                    type="file"
                    accept=".txt,.md,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                rows={8}
                disabled={generating}
                placeholder="Paste the full job description here…"
                className="mt-1.5 w-full bg-foreground/[0.03] border border-foreground/[0.06] rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-foreground/35 outline-none focus:border-foreground/20 transition-colors resize-none"
              />
              <p className="mt-1 text-[11px] text-foreground/45 tracking-tight">
                {jd.trim().length === 0 ? "Empty" : `${jd.trim().split(/\s+/).length} words`}
              </p>
            </div>

            <div>
              <label className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                Tone
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    disabled={generating}
                    onClick={() => setTone(t.value)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-left transition-all border",
                      tone === t.value
                        ? "bg-violet-500/12 border-violet-500/40 ring-1 ring-violet-500/25 text-violet-800 shadow-[0_1px_2px_rgba(124,58,237,0.15)]"
                        : "bg-foreground/[0.03] border-foreground/[0.06] text-foreground/75 hover:bg-foreground/[0.06] hover:border-foreground/[0.12]",
                    )}
                  >
                    <p className="text-[12.5px] font-medium tracking-tight">{t.label}</p>
                    <p
                      className={cn(
                        "text-[11px] tracking-tight",
                        tone === t.value ? "text-violet-700/70" : "text-foreground/50",
                      )}
                    >
                      {t.hint}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                Length
              </label>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={generating}
                    onClick={() => setPages(n)}
                    className={cn(
                      "rounded-lg px-2.5 py-2 text-left transition-colors border",
                      pages === n
                        ? "bg-foreground text-background border-foreground"
                        : "bg-foreground/[0.03] border-foreground/[0.06] hover:bg-foreground/[0.06]",
                    )}
                  >
                    <p className="text-[12.5px] font-medium tracking-tight">
                      {n === 1 ? "1 page" : n === 2 ? "2 pages" : "3 pages"}
                    </p>
                    <p
                      className={cn(
                        "text-[11px] tracking-tight",
                        pages === n ? "text-background/60" : "text-foreground/50",
                      )}
                    >
                      {n === 1 ? "~350 words" : n === 2 ? "~700 words" : "~1050 words"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {ent.plan === "pro" && (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3 py-1.5 text-[11.5px] tracking-tight text-foreground/65">
                <span>Cover letters this month</span>
                <span className="font-medium text-foreground/85">
                  {ent.usage.cover_letters} / 20
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1 pb-1">
              <button
                onClick={generate}
                disabled={generating || jd.trim().length < 40}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium tracking-tight transition-colors",
                  generating || jd.trim().length < 40
                    ? "bg-foreground/10 text-foreground/40 cursor-not-allowed"
                    : "bg-foreground text-background hover:bg-foreground/90",
                  generating && "shine-button",
                )}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Drafting…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate
                  </>
                )}
              </button>
              {(hasLetter || jd) && !generating && (
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-medium tracking-tight text-foreground/60 hover:text-foreground hover:bg-foreground/[0.05] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Right: structured letter */}
        <SectionCard className="lg:col-span-7 p-0 overflow-hidden">
          <div className="px-5 sm:px-6 pt-3 pb-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                {hasLetter ? "Editable letter" : "Letter preview"}
              </p>
              <p className="mt-1 text-[12.5px] text-foreground/55 tracking-tight">
                {hasLetter
                  ? "Click any field to edit. Open full screen to format the letter."
                  : "Your letter will appear in standard business-letter format."}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {hasLetter && matchScore !== null && (
                <span
                  title="Personalization score — % of JD keywords woven into your letter"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-tight border",
                    matchScore >= 75
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : matchScore >= 50
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : "bg-rose-500/10 text-rose-600 border-rose-500/20",
                  )}
                >
                  <span className="opacity-70">Match</span>
                  <span>{matchScore}%</span>
                </span>
              )}
              <button
                onClick={() => setFullscreen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/[0.1] bg-foreground/[0.03] px-2.5 py-1.5 text-[12px] font-medium tracking-tight text-foreground/80 hover:bg-foreground/[0.06] transition-colors"
                title="Open full screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Full screen
              </button>
              {hasLetter && (
                <button
                  onClick={generate}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium tracking-tight text-foreground/60 hover:text-foreground hover:bg-foreground/[0.05] transition-colors disabled:opacity-50"
                  title="Regenerate"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", generating && "animate-spin")} />
                  Regenerate
                </button>
              )}
            </div>
          </div>

          <div className="relative border-t border-foreground/[0.06] bg-foreground/[0.015] p-3 sm:p-4">
            {!hasLetter && !generating ? (
              <EmptyState
                icon={Mail}
                title="No cover letter yet"
                description="Paste the job description on the left, pick a tone and length, then generate a tailored letter that maps your resume to the role."
                preview={<PreviewCoverLetter />}
                ctaLabel={jd.trim().length < 40 ? "Paste a job description to start" : "Generate letter"}
                onCta={jd.trim().length < 40 ? undefined : generate}
              />
            ) : (
              <>
                <LetterSheet
                  doc={doc}
                  update={update}
                  hasLetter={hasLetter}
                  isEmpty={!hasLetter}
                  typo={typo}
                  compact
                />
                <DraftingOverlay active={generating} />

                {hasLetter && <LetterStats text={doc.body} />}

                {/* Action bar */}
                <div className="mx-auto mt-4 max-w-[640px] flex flex-wrap items-center gap-2">
                  <button
                    onClick={onDownloadPdf}
                    disabled={!hasLetter}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium tracking-tight transition-colors",
                      hasLetter
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "bg-foreground/10 text-foreground/40 cursor-not-allowed",
                    )}
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                  <button
                    onClick={onDownloadDocx}
                    disabled={!hasLetter}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium tracking-tight transition-colors",
                      hasLetter
                        ? "border-foreground/[0.1] bg-foreground/[0.03] text-foreground/80 hover:bg-foreground/[0.06]"
                        : "border-foreground/[0.06] text-foreground/30 cursor-not-allowed",
                    )}
                  >
                    <Download className="w-3.5 h-3.5" />
                    DOCX
                  </button>
                  <button
                    onClick={onDownloadTxt}
                    disabled={!hasLetter}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium tracking-tight transition-colors",
                      hasLetter
                        ? "border-foreground/[0.1] bg-foreground/[0.03] text-foreground/80 hover:bg-foreground/[0.06]"
                        : "border-foreground/[0.06] text-foreground/30 cursor-not-allowed",
                    )}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Plain text (ATS)
                  </button>
                  <div className="ml-auto">
                    <button
                      onClick={onCopy}
                      disabled={!hasLetter}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium tracking-tight transition-colors",
                        hasLetter
                          ? "text-foreground/60 hover:text-foreground hover:bg-foreground/[0.05]"
                          : "text-foreground/30 cursor-not-allowed",
                      )}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        </SectionCard>
      </div>

      <CoverLetterLibrary userId={user?.id} refreshKey={libraryKey} />

      {/* Fullscreen letter editor */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
          <FullscreenToolbar
            typo={typo}
            updateTypo={updateTypo}
            hasLetter={hasLetter}
            onPdf={onDownloadPdf}
            onDocx={onDownloadDocx}
            onTxt={onDownloadTxt}
            onExit={() => setFullscreen(false)}
          />
          <div className="flex-1 overflow-auto py-8 px-4">
            <LetterSheet
              doc={doc}
              update={update}
              hasLetter={hasLetter}
              isEmpty={!hasLetter}
              typo={typo}
              compact={false}
            />
          </div>
        </div>
      )}

      <UpgradePlanDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={ent.plan}
        feature="cover_letters"
      />
    </div>
  );
};

export default CoverLetterGenerator;
