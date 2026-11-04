import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Check, Copy, Wand2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "./SectionCard";
import { cn } from "@/lib/utils";

type Tailoring = {
  id: string;
  resume_id: string;
  analysis_id: string | null;
  target_role: string;
  job_description: string | null;
  summary: string | null;
  cover_note: string | null;
  match_before: number | null;
  match_after: number | null;
  skills: { group: string; items: string[] }[];
  keywords_to_add: { keyword: string; reason: string; confidence: "high" | "medium" | "low" }[];
  bullets: {
    role: string;
    company: string;
    rewrites: { before: string; after: string; why: string }[];
  }[];
  created_at: string;
};

type Props = {
  resumeId: string | null;
  analysisId: string | null;
  defaultTargetRole?: string;
  className?: string;
};

const CONFIDENCE_TONE: Record<"high" | "medium" | "low", string> = {
  high: "bg-[hsl(150_55%_45%/0.10)] text-[hsl(150_45%_28%)]",
  medium: "bg-[hsl(258_45%_58%/0.10)] text-[hsl(258_38%_42%)]",
  low: "bg-[hsl(35_92%_55%/0.12)] text-[hsl(28_70%_38%)]",
};

export const TailoredEditsPanel = ({
  resumeId,
  analysisId,
  defaultTargetRole,
  className,
}: Props) => {
  const [targetRole, setTargetRole] = useState(defaultTargetRole ?? "");
  const [jd, setJd] = useState("");
  const [generating, setGenerating] = useState(false);
  const [tailorings, setTailorings] = useState<Tailoring[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (defaultTargetRole && !targetRole) setTargetRole(defaultTargetRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTargetRole]);

  const refresh = async () => {
    if (!resumeId) {
      setTailorings([]);
      return;
    }
    const { data, error } = await supabase
      .from("resume_tailorings")
      .select("*")
      .eq("resume_id", resumeId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      toast.error("Couldn't load tailored versions");
      return;
    }
    setTailorings((data ?? []) as unknown as Tailoring[]);
    if (!activeId && data?.[0]) setActiveId(data[0].id);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  const active = useMemo(
    () => tailorings.find((t) => t.id === activeId) ?? tailorings[0],
    [tailorings, activeId],
  );

  const generate = async () => {
    if (!resumeId) {
      toast.error("Upload a resume first.");
      return;
    }
    if (targetRole.trim().length < 2) {
      toast.error("Enter a target role (e.g. Data Analyst).");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("tailor-resume", {
        body: {
          resume_id: resumeId,
          analysis_id: analysisId ?? undefined,
          target_role: targetRole.trim(),
          job_description: jd.trim() || undefined,
        },
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        const body = ctx && typeof ctx.json === "function" ? await ctx.json().catch(() => null) : null;
        throw new Error(body?.error || "We couldn't reach the AI right now. Any credit used was refunded — please try again.");
      }
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const id = (data as { tailoring?: Tailoring })?.tailoring?.id;
      if (id) setActiveId(id);
      await refresh();
      toast.success("Tailored version ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("resume_tailorings").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete");
      return;
    }
    if (activeId === id) setActiveId(null);
    refresh();
  };

  const copy = async (text: string, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Generator */}
      <SectionCard className="p-0 overflow-hidden">
        <div className="px-5 sm:px-6 pt-5 pb-4 flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full grid place-items-center bg-foreground text-background shrink-0">
            <Wand2 className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              Tailored edits
            </p>
            <p className="text-[13px] text-foreground/65 tracking-tight">
              Pick a role. Get a polished, role-specific version — summary, skills, rewritten bullets.
            </p>
          </div>
        </div>

        <div className="border-t border-foreground/[0.06] px-5 sm:px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              Target role
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Data Analyst"
              disabled={generating}
              className="mt-1.5 w-full bg-foreground/[0.03] border border-foreground/[0.06] rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-foreground/35 outline-none focus:border-foreground/20 transition-colors"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
              Job description (optional)
            </label>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              rows={3}
              placeholder="Paste the JD here for sharper keyword matching."
              disabled={generating}
              className="mt-1.5 w-full bg-foreground/[0.03] border border-foreground/[0.06] rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-foreground/35 outline-none focus:border-foreground/20 transition-colors resize-none"
            />
          </div>
        </div>

        <div className="border-t border-foreground/[0.06] px-5 sm:px-6 py-3 flex items-center justify-between gap-3">
          <p className="text-[11.5px] text-foreground/55 tracking-tight">
            {resumeId
              ? "Uses your latest analysis to focus the rewrite."
              : "Upload a resume above first."}
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={generating || !resumeId}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-medium tracking-tight transition-opacity",
              "bg-foreground text-background hover:opacity-90 disabled:opacity-50",
            )}
          >
            {generating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Tailoring…
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Generate tailored version
              </>
            )}
          </button>
        </div>
      </SectionCard>

      {/* Versions list */}
      {tailorings.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {tailorings.map((t) => {
            const isActive = active?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[12px] tracking-tight border transition-colors",
                  isActive
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card/55 backdrop-blur border-white/70 text-foreground/70 hover:bg-card",
                )}
              >
                {t.target_role}
                <span className={cn("ml-2 text-[10.5px]", isActive ? "text-background/55" : "text-foreground/40")}>
                  {new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active result */}
      {active && (
        <>
          {/* Headline result */}
          <SectionCard>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                Optimized for
              </p>
              <button
                type="button"
                onClick={() => remove(active.id)}
                className="text-foreground/40 hover:text-foreground/80 transition-colors"
                aria-label="Delete version"
                title="Delete this version"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="mt-2 text-[28px] sm:text-[32px] leading-[1.1] font-semibold tracking-[-0.035em] text-foreground">
              Here is your optimized version for{" "}
              <span
                style={{
                  background: "linear-gradient(120deg,#0E0B1F,#6D54B3,#0E0B1F)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {active.target_role}
              </span>
              .
            </p>
            {active.cover_note && (
              <p className="mt-3 text-[13px] text-foreground/65 tracking-tight leading-snug">
                {active.cover_note}
              </p>
            )}

            {(active.match_before != null || active.match_after != null) && (
              <div className="mt-4 grid grid-cols-2 gap-3 max-w-sm">
                <MatchPill label="Before" value={active.match_before ?? 0} muted />
                <MatchPill label="After" value={active.match_after ?? 0} />
              </div>
            )}
          </SectionCard>

          {/* Summary */}
          {active.summary && (
            <SectionCard>
              <div className="flex items-center justify-between">
                <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                  Rewritten summary
                </p>
                <CopyBtn onClick={() => copy(active.summary ?? "", "Summary copied")} />
              </div>
              <p className="mt-3 text-[14px] leading-[1.55] text-foreground tracking-tight">
                {active.summary}
              </p>
            </SectionCard>
          )}

          {/* Skills */}
          {active.skills?.length > 0 && (
            <SectionCard>
              <div className="flex items-center justify-between">
                <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                  Optimized skills
                </p>
                <CopyBtn
                  onClick={() =>
                    copy(
                      active.skills
                        .map((g) => `${g.group}: ${g.items.join(", ")}`)
                        .join("\n"),
                      "Skills copied",
                    )
                  }
                />
              </div>
              <div className="mt-3 space-y-3">
                {active.skills.map((g, i) => (
                  <div key={i}>
                    <p className="text-[11px] font-medium text-foreground/55 tracking-tight">
                      {g.group}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {g.items.map((s, j) => (
                        <span
                          key={j}
                          className="text-[12px] px-2.5 py-1 rounded-full bg-foreground/[0.05] text-foreground/80 tracking-tight"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Keywords to add */}
          {active.keywords_to_add?.length > 0 && (
            <SectionCard className="p-0 overflow-hidden">
              <div className="px-5 sm:px-6 pt-5 pb-3">
                <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
                  Keywords to inject
                </p>
                <p className="text-[12.5px] text-foreground/55 tracking-tight mt-1">
                  Specific to {active.target_role}. Confidence reflects how plausibly you can claim each.
                </p>
              </div>
              <ul className="border-t border-foreground/[0.06] divide-y divide-foreground/[0.06]">
                {active.keywords_to_add.map((k, i) => (
                  <li key={i} className="px-5 sm:px-6 py-3.5 flex items-start gap-3">
                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full tracking-tight mt-0.5",
                        CONFIDENCE_TONE[k.confidence],
                      )}
                    >
                      {k.confidence}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium tracking-tight text-foreground">
                        {k.keyword}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-foreground/65 leading-snug tracking-tight">
                        {k.reason}
                      </p>
                    </div>
                    <CopyBtn onClick={() => copy(k.keyword, "Keyword copied")} />
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Bullets per role */}
          {active.bullets?.map((roleGroup, ri) => (
            <SectionCard key={ri}>
              <div className="flex items-center justify-between">
                <p className="text-[13.5px] font-medium tracking-tight text-foreground">
                  {roleGroup.role}{" "}
                  <span className="text-foreground/55 font-normal">· {roleGroup.company}</span>
                </p>
                <CopyBtn
                  onClick={() =>
                    copy(
                      roleGroup.rewrites.map((r) => `• ${r.after}`).join("\n"),
                      "Bullets copied",
                    )
                  }
                />
              </div>
              <ul className="mt-3 space-y-3">
                {roleGroup.rewrites.map((r, i) => (
                  <li key={i} className="rounded-xl bg-foreground/[0.025] p-3.5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] tracking-[0.18em] uppercase text-foreground/40 font-medium">
                          Before
                        </p>
                        <p className="mt-1.5 text-[13px] text-foreground/70 leading-snug tracking-tight line-through decoration-foreground/20">
                          {r.before}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] tracking-[0.18em] uppercase text-[hsl(258_38%_52%)] font-medium">
                            After
                          </p>
                          <button
                            type="button"
                            onClick={() => copy(r.after, "Bullet copied")}
                            className="text-foreground/40 hover:text-foreground/80 transition-colors"
                            aria-label="Copy bullet"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="mt-1.5 text-[13px] text-foreground leading-snug tracking-tight font-medium">
                          {r.after}
                        </p>
                      </div>
                    </div>
                    {r.why && (
                      <p className="mt-2.5 text-[11.5px] text-foreground/55 tracking-tight">
                        Why: {r.why}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </SectionCard>
          ))}
        </>
      )}

      {!active && !generating && (
        <SectionCard>
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
            No tailored version yet
          </p>
          <p className="mt-2 text-[14px] text-foreground/70 tracking-tight leading-snug">
            Pick a target role above (and optionally paste the JD) and we'll rewrite your summary,
            skills, and bullets to match — with realistic, role-specific language.
          </p>
        </SectionCard>
      )}
    </div>
  );
};

const MatchPill = ({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) => (
  <div
    className={cn(
      "rounded-xl px-3.5 py-2.5",
      muted ? "bg-foreground/[0.03]" : "bg-[hsl(258_45%_58%/0.08)]",
    )}
  >
    <p className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/45 font-medium">
      {label}
    </p>
    <p className="mt-1 text-[24px] leading-none font-semibold tabular-nums tracking-[-0.02em] text-foreground">
      {Math.max(0, Math.min(100, Math.round(value)))}
      <span className="text-[14px] text-foreground/30">%</span>
    </p>
  </div>
);

const CopyBtn = ({ onClick }: { onClick: () => void }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        onClick();
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-foreground/[0.04] hover:bg-foreground/[0.08] text-foreground/70 text-[11px] tracking-tight transition-colors"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
};
