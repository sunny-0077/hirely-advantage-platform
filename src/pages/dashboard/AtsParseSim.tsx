import { useRef, useState } from "react";
import { Loader2, Upload, FileText, X, Sparkles, ScanLine } from "lucide-react";
import GapResult from "@/components/dashboard/gap/GapResult";
import { toast } from "sonner";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import {
  ACCEPTED_EXTS,
  ACCEPTED_MIME,
  MAX_FILE_BYTES,
  extToMime,
  extractResumeText,
} from "@/lib/resumeParser";
import { cn } from "@/lib/utils";

export default function AtsParseSim() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [running, setRunning] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);

  const onFile = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) return toast.error("File too large. Max 10 MB.");
    const mime = file.type || extToMime(file.name) || "";
    if (!ACCEPTED_MIME.includes(mime)) return toast.error("Use PDF, DOCX or TXT.");
    setExtracting(true);
    try {
      const text = await extractResumeText(file);
      if (!text || text.length < 80) {
        toast.error("Couldn't read enough text. Try a different file.");
        return;
      }
      setResumeText(text);
      setFileName(file.name);
    } catch (e) {
      console.error(e);
      toast.error("Failed to read file.");
    } finally {
      setExtracting(false);
    }
  };

  const run = async () => {
    if (resumeText.trim().length < 80) return toast.error("Upload a resume first.");
    setRunning(true);
    setMarkdown(null);
    try {
      const { data, error } = await supabase.functions.invoke("ats-parse-sim", {
        body: { resume_text: resumeText },
      });
      if (error) throw new Error(error.message || "Failed");
      const md = data as { markdown?: string; error?: string } | null;
      if (md?.error) throw new Error(md.error);
      if (!md?.markdown) throw new Error("Empty response");
      setMarkdown(md.markdown);
      toast.success("ATS parse simulation ready.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setResumeText("");
    setFileName(null);
    setMarkdown(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10.5px] tracking-[0.22em] uppercase text-foreground/45 font-medium flex items-center gap-2">
          <ScanLine className="w-3.5 h-3.5" />
          ATS Parse Simulator
        </p>
        <h1 className="mt-2 text-[28px] sm:text-[32px] leading-tight font-medium tracking-tight text-foreground">
          See your resume through the recruiter's robot.
        </h1>
        <p className="mt-2 text-[13.5px] text-foreground/60 max-w-2xl">
          We simulate Workday, Greenhouse, Lever, iCIMS and Taleo — and report exactly
          what they extracted, what they misread, and what they silently dropped.
        </p>
      </div>

      <SectionCard className="p-0 overflow-hidden">
        <button
          type="button"
          onClick={() => !extracting && inputRef.current?.click()}
          disabled={extracting}
          className="w-full text-left p-6 sm:p-7"
        >
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center",
                fileName
                  ? "bg-foreground/5"
                  : "bg-gradient-to-br from-[#0E0B1F] to-[#3a2d5e] text-white",
              )}
            >
              {extracting ? (
                <Loader2 className="w-4 h-4 animate-spin text-foreground/70" />
              ) : fileName ? (
                <FileText className="w-4 h-4 text-foreground/70" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                Resume
              </p>
              <p className="mt-1 text-[15px] leading-snug font-medium tracking-tight text-foreground truncate">
                {extracting ? "Reading resume…" : fileName ?? "Upload PDF, DOCX or TXT"}
              </p>
              <p className="mt-1 text-[12px] text-foreground/55">
                We read your resume locally before simulating the parse.
              </p>
            </div>
            {fileName && !extracting && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFileName(null);
                  setResumeText("");
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="shrink-0 w-7 h-7 rounded-full hover:bg-foreground/5 flex items-center justify-center text-foreground/60"
                aria-label="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTS.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </SectionCard>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={running || extracting}
          className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2.5 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {running ? "Simulating parse…" : markdown ? "Re-run simulation" : "Simulate ATS parse"}
        </button>
        {(resumeText || markdown) && (
          <button
            type="button"
            onClick={reset}
            className="text-[12.5px] text-foreground/60 hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {markdown && <GapResult markdown={markdown} preserveOrder />}
    </div>
  );
}
