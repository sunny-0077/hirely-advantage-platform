import { useMemo, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChevronDown, Sparkles, Route, Target } from "lucide-react";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { cn } from "@/lib/utils";

// ---------- Parsing helpers ----------

type Row = { cells: string[] };

function extractTablesInSection(md: string, sectionRegex: RegExp) {
  // Grab text of the matched section until next H2
  const lines = md.split(/\r?\n/);
  const out: { subheading: string; rows: Row[] }[] = [];
  let inSection = false;
  let subheading = "";
  let tableBuf: string[] = [];
  const flush = () => {
    if (tableBuf.length < 2) {
      tableBuf = [];
      return;
    }
    const rows = tableBuf
      .filter((l) => /^\s*\|/.test(l) && !/^\s*\|\s*[-: |]+\|\s*$/.test(l))
      .map((l) => ({
        cells: l
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim()),
      }));
    if (rows.length > 1) out.push({ subheading, rows: rows.slice(1) }); // drop header row
    tableBuf = [];
  };
  for (const raw of lines) {
    const l = raw.replace(/\r$/, "");
    const h2 = /^##\s+(.+)/.exec(l);
    if (h2) {
      flush();
      inSection = sectionRegex.test(h2[1]);
      subheading = "";
      continue;
    }
    if (!inSection) continue;
    const h3 = /^###\s+(.+)/.exec(l);
    if (h3) {
      flush();
      subheading = h3[1].replace(/\(.*?\)/g, "").trim();
      continue;
    }
    if (/^\s*\|/.test(l)) {
      tableBuf.push(l);
    } else if (tableBuf.length) {
      flush();
    }
  }
  flush();
  return out;
}

type KeywordEntry = { keyword: string; state: "yes" | "partial" | "no"; priority: "critical" | "important" | "nice" };

function parseKeywordTables(md: string) {
  const groups = extractTablesInSection(md, /keyword gap/i);
  const result: { category: string; entries: KeywordEntry[] }[] = [];
  for (const g of groups) {
    const entries: KeywordEntry[] = [];
    for (const r of g.rows) {
      const [keyword = "", inResume = "", , priority = ""] = r.cells;
      if (!keyword) continue;
      const stateStr = inResume.toLowerCase();
      const state: KeywordEntry["state"] = /✅|yes/.test(stateStr)
        ? "yes"
        : /⚠️|partial/.test(stateStr)
          ? "partial"
          : "no";
      const p = priority.toLowerCase();
      const pri: KeywordEntry["priority"] = /critical/.test(p)
        ? "critical"
        : /important/.test(p)
          ? "important"
          : "nice";
      entries.push({ keyword: keyword.replace(/\*/g, "").trim(), state, priority: pri });
    }
    if (entries.length) result.push({ category: g.subheading || "Skills", entries });
  }
  return result;
}

function coverageScore(entries: KeywordEntry[]) {
  const w = { critical: 3, important: 2, nice: 1 };
  const s = { yes: 1, partial: 0.5, no: 0 };
  let num = 0;
  let den = 0;
  for (const e of entries) {
    num += w[e.priority] * s[e.state];
    den += w[e.priority];
  }
  return den ? Math.round((num / den) * 100) : 0;
}

// ---------- Priority Action List → roadmap ----------

type Step = { tag: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; title: string; detail: string; minutes?: string };

function parseActionList(md: string): Step[] {
  const lines = md.split(/\r?\n/);
  let inSection = false;
  const items: string[] = [];
  let buf = "";
  for (const raw of lines) {
    const l = raw.replace(/\r$/, "");
    const h2 = /^##\s+(.+)/.exec(l);
    if (h2) {
      if (buf) items.push(buf.trim());
      buf = "";
      inSection = /priority action/i.test(h2[1]);
      continue;
    }
    if (!inSection) continue;
    if (/^\s*\d+\.\s/.test(l)) {
      if (buf) items.push(buf.trim());
      buf = l.replace(/^\s*\d+\.\s*/, "");
    } else if (buf && l.trim()) {
      buf += " " + l.trim();
    }
  }
  if (buf) items.push(buf.trim());

  return items
    .map((raw): Step | null => {
      const tagMatch = /^\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s*/i.exec(raw);
      const tag = (tagMatch?.[1]?.toUpperCase() as Step["tag"]) ?? "MEDIUM";
      const rest = raw.replace(/^\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s*/i, "").replace(/\*\*/g, "");
      const minMatch = /(?:takes\s*~?\s*)([\d.]+\s*(?:min|minutes|hr|hour|hours))/i.exec(rest);
      const minutes = minMatch?.[1];
      // First sentence = title, remainder = detail
      const sentences = rest.split(/(?<=[.!?])\s+/);
      const title = (sentences[0] || rest).replace(/\s*Takes.*$/i, "").trim();
      const detail = sentences.slice(1).join(" ").replace(/\s*Takes.*$/i, "").trim();
      if (!title) return null;
      return { tag, title, detail, minutes };
    })
    .filter((x): x is Step => !!x);
}

const TAG_META: Record<Step["tag"], { label: string; className: string; dot: string }> = {
  CRITICAL: {
    label: "Critical",
    className: "text-rose-600 bg-rose-500/10 ring-1 ring-rose-500/25",
    dot: "bg-rose-500",
  },
  HIGH: {
    label: "High",
    className: "text-rose-600 bg-rose-500/10 ring-1 ring-rose-500/25",
    dot: "bg-rose-500",
  },
  MEDIUM: {
    label: "Moderate",
    className: "text-amber-600 bg-amber-500/10 ring-1 ring-amber-500/25",
    dot: "bg-amber-500",
  },
  LOW: {
    label: "Minor",
    className: "text-sky-600 bg-sky-500/10 ring-1 ring-sky-500/25",
    dot: "bg-sky-500",
  },
};

// ---------- Skill gap severities from Hard requirements + coverage ----------

type SkillGap = { skill: string; severity: "critical" | "moderate" | "minor"; note?: string };

function parseSkillGaps(md: string): SkillGap[] {
  const cats = parseKeywordTables(md);
  const gaps: SkillGap[] = [];
  for (const cat of cats) {
    for (const e of cat.entries) {
      if (e.state === "yes") continue;
      const severity: SkillGap["severity"] =
        e.priority === "critical"
          ? e.state === "no"
            ? "critical"
            : "moderate"
          : e.priority === "important"
            ? e.state === "no"
              ? "moderate"
              : "minor"
            : "minor";
      gaps.push({
        skill: e.keyword,
        severity,
        note: `${cat.category} · ${e.state === "no" ? "missing" : "partial"}`,
      });
    }
  }
  const rank = { critical: 0, moderate: 1, minor: 2 } as const;
  return gaps.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 12);
}

const SEV_META: Record<SkillGap["severity"], string> = {
  critical: "text-rose-600 bg-rose-500/10 ring-1 ring-rose-500/25",
  moderate: "text-amber-600 bg-amber-500/10 ring-1 ring-amber-500/25",
  minor: "text-sky-600 bg-sky-500/10 ring-1 ring-sky-500/25",
};

// ---------- Component ----------

export default function GapInsights({ markdown }: { markdown: string }) {
  const radarData = useMemo(() => {
    const cats = parseKeywordTables(markdown);
    return cats
      .filter((c) => c.entries.length >= 1)
      .slice(0, 8)
      .map((c) => ({
        dimension: c.category.length > 22 ? c.category.slice(0, 20) + "…" : c.category,
        You: coverageScore(c.entries),
        Required: 100,
      }));
  }, [markdown]);

  const steps = useMemo(() => parseActionList(markdown), [markdown]);
  const gaps = useMemo(() => parseSkillGaps(markdown), [markdown]);
  const [openStep, setOpenStep] = useState<number | null>(0);

  if (radarData.length < 3 && steps.length === 0 && gaps.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Radar + Gap badges */}
      <div className="grid lg:grid-cols-5 gap-4">
        {radarData.length >= 3 && (
          <SectionCard className="lg:col-span-3 p-6 sm:p-7">
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center">
                <Target className="w-[16px] h-[16px] text-violet-600" />
              </div>
              <div>
                <p className="text-[10.5px] tracking-[0.22em] uppercase text-foreground/50 font-semibold">
                  Skill radar
                </p>
                <h3 className="mt-1 text-[18px] font-semibold tracking-tight text-foreground">
                  You vs. the role, side by side
                </h3>
              </div>
            </div>
            <div className="h-[300px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="hsl(var(--foreground) / 0.12)" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fill: "hsl(var(--foreground) / 0.7)", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: "hsl(var(--foreground) / 0.35)", fontSize: 10 }}
                    axisLine={false}
                  />
                  <Radar
                    name="Required"
                    dataKey="Required"
                    stroke="hsl(var(--foreground) / 0.35)"
                    strokeDasharray="4 4"
                    fill="hsl(var(--foreground) / 0.06)"
                    fillOpacity={1}
                  />
                  <Radar
                    name="You"
                    dataKey="You"
                    stroke="#7c3aed"
                    fill="#7c3aed"
                    fillOpacity={0.28}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    iconType="circle"
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        )}

        {gaps.length > 0 && (
          <SectionCard className="lg:col-span-2 p-6 sm:p-7">
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-rose-500/10 ring-1 ring-rose-500/20 flex items-center justify-center">
                <Sparkles className="w-[16px] h-[16px] text-rose-600" />
              </div>
              <div>
                <p className="text-[10.5px] tracking-[0.22em] uppercase text-foreground/50 font-semibold">
                  Gap severity
                </p>
                <h3 className="mt-1 text-[18px] font-semibold tracking-tight text-foreground">
                  Critical gaps surface first
                </h3>
              </div>
            </div>
            <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {gaps.map((g, i) => (
                <li
                  key={`${g.skill}-${i}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-foreground/[0.03] ring-1 ring-foreground/[0.05]"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{g.skill}</p>
                    {g.note && (
                      <p className="text-[11px] text-foreground/50 truncate">{g.note}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-[10.5px] font-semibold tracking-[0.14em] uppercase px-2 py-0.5 rounded-full",
                      SEV_META[g.severity],
                    )}
                  >
                    {g.severity}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </div>

      {/* Roadmap */}
      {steps.length > 0 && (
        <SectionCard className="p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-6">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-sky-500/10 ring-1 ring-sky-500/20 flex items-center justify-center">
              <Route className="w-[16px] h-[16px] text-sky-600" />
            </div>
            <div>
              <p className="text-[10.5px] tracking-[0.22em] uppercase text-foreground/50 font-semibold">
                Roadmap
              </p>
              <h3 className="mt-1 text-[18px] font-semibold tracking-tight text-foreground">
                Your ordered path to close the gap
              </h3>
            </div>
          </div>

          <ol className="relative">
            {/* Animated connector line */}
            <svg
              className="absolute left-[15px] top-2 bottom-2 w-[2px] pointer-events-none"
              preserveAspectRatio="none"
              viewBox="0 0 2 1000"
              aria-hidden
            >
              <line
                x1="1"
                y1="0"
                x2="1"
                y2="1000"
                stroke="hsl(var(--foreground) / 0.14)"
                strokeWidth="2"
                strokeDasharray="1000"
                style={{ animation: "draw-line 1.4s ease-out forwards" }}
              />
            </svg>

            {steps.map((s, i) => {
              const meta = TAG_META[s.tag];
              const open = openStep === i;
              return (
                <li key={i} className="relative pl-12 pb-5 last:pb-0">
                  <span
                    className={cn(
                      "absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white ring-4 ring-background",
                      meta.dot,
                    )}
                  >
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenStep(open ? null : i)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "text-[10px] font-semibold tracking-[0.14em] uppercase px-2 py-0.5 rounded-full",
                              meta.className,
                            )}
                          >
                            {meta.label}
                          </span>
                          {s.minutes && (
                            <span className="text-[10.5px] tracking-[0.12em] uppercase text-foreground/50">
                              ~{s.minutes}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-[14.5px] leading-snug font-medium text-foreground">
                          {s.title}
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 mt-1 text-foreground/40 transition-transform shrink-0",
                          open && "rotate-180",
                        )}
                      />
                    </div>
                  </button>
                  {open && s.detail && (
                    <div className="mt-2 text-[13px] leading-relaxed text-foreground/70 animate-fade-in">
                      {s.detail}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </SectionCard>
      )}
    </div>
  );
}
