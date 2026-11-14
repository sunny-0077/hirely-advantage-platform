import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2, GripVertical } from "lucide-react";
import {
  APPROVED_SECTION_NAMES,
  type ResumeDocument,
  type Section,
  type SectionType,
} from "@/lib/resumeBuilder/types";
import { newId } from "@/lib/resumeBuilder/templates";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AiActionsButton } from "./AiActionsButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  doc: ResumeDocument;
  setDoc: (next: ResumeDocument) => void;
  role?: string;
};

export function SectionsEditor({ doc, setDoc, role }: Props) {
  const update = (patch: Partial<ResumeDocument>) => setDoc({ ...doc, ...patch });
  const updateContent = (patch: Partial<ResumeDocument["content"]>) =>
    setDoc({ ...doc, content: { ...doc.content, ...patch } });

  const moveSection = (id: string, dir: -1 | 1) => {
    const i = doc.sections.findIndex((s) => s.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= doc.sections.length) return;
    const next = [...doc.sections];
    [next[i], next[j]] = [next[j], next[i]];
    update({ sections: next });
  };

  const toggleSection = (id: string) =>
    update({
      sections: doc.sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    });

  const removeSection = (id: string) =>
    update({ sections: doc.sections.filter((s) => s.id !== id) });

  const renameSection = (id: string, name: string) =>
    update({
      sections: doc.sections.map((s) => (s.id === id ? { ...s, name } : s)),
    });

  const addSection = (type: SectionType) => {
    if (doc.sections.some((s) => s.type === type)) return;
    update({
      sections: [
        ...doc.sections,
        { id: newId(), type, name: APPROVED_SECTION_NAMES[type][0], enabled: true },
      ],
    });
  };

  const missingTypes = (
    ["summary", "skills", "experience", "projects", "education", "certifications", "achievements", "publications", "additional", "languages", "portfolio"] as SectionType[]
  ).filter((t) => !doc.sections.some((s) => s.type === t));

  return (
    <div className="space-y-3">
      {doc.sections.map((s, i) => (
        <SectionCard
          key={s.id}
          section={s}
          first={i === 0}
          last={i === doc.sections.length - 1}
          onMove={(d) => moveSection(s.id, d)}
          onToggle={() => toggleSection(s.id)}
          onRemove={() => removeSection(s.id)}
          onRename={(name) => renameSection(s.id, name)}
          doc={doc}
          updateContent={updateContent}
          role={role}
        />
      ))}

      {missingTypes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] uppercase tracking-[0.18em] text-foreground/45">
            Add section:
          </span>
          {missingTypes.map((t) => (
            <Button variant="outline" size="sm"
              key={t}
              onClick={() => addSection(t)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-foreground/[0.1] bg-foreground/[0.04] text-[11.5px] text-foreground/75 hover:bg-foreground/[0.07]"
            >
              <Plus className="w-3 h-3" />
              {APPROVED_SECTION_NAMES[t][0]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionCard({
  section,
  first,
  last,
  onMove,
  onToggle,
  onRemove,
  onRename,
  doc,
  updateContent,
  role,
}: {
  section: Section;
  first: boolean;
  last: boolean;
  onMove: (d: -1 | 1) => void;
  onToggle: () => void;
  onRemove: () => void;
  onRename: (n: string) => void;
  doc: ResumeDocument;
  updateContent: (p: Partial<ResumeDocument["content"]>) => void;
  role?: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <GripVertical className="w-3.5 h-3.5 text-foreground/30" />
        <Select value={section.name} onValueChange={onRename}>
          <SelectTrigger className="h-8 w-auto min-w-[200px] text-[12.5px] font-medium bg-transparent border-foreground/[0.1]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPROVED_SECTION_NAMES[section.type].map((n) => (
              <SelectItem key={n} value={n} className="text-[12.5px]">
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-[10px] uppercase tracking-wider text-foreground/40">
          ATS-safe heading
        </span>

        <div className="ml-auto flex items-center gap-1">
          <IconBtn title="Move up" disabled={first} onClick={() => onMove(-1)}>
            <ChevronUp className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn title="Move down" disabled={last} onClick={() => onMove(1)}>
            <ChevronDown className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn title={section.enabled ? "Hide section" : "Show section"} onClick={onToggle}>
            {section.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </IconBtn>
          <IconBtn title="Remove section" onClick={onRemove}>
            <Trash2 className="w-3.5 h-3.5" />
          </IconBtn>
          <Button variant="ghost" size="sm"
            onClick={() => setOpen((o) => !o)}
            className="text-[11px] text-foreground/55 hover:text-foreground px-2"
          >
            {open ? "Collapse" : "Expand"}
          </Button>
        </div>
      </div>

      {open && section.enabled && (
        <div className="mt-3 space-y-3">
          {section.type === "summary" && (
            <SummaryFields doc={doc} update={updateContent} role={role} />
          )}
          {section.type === "skills" && <SkillsFields doc={doc} update={updateContent} />}
          {section.type === "experience" && (
            <ExperienceFields doc={doc} update={updateContent} role={role} />
          )}
          {section.type === "projects" && (
            <ProjectsFields doc={doc} update={updateContent} role={role} />
          )}
          {section.type === "education" && <EducationFields doc={doc} update={updateContent} />}
          {section.type === "certifications" && <CertFields doc={doc} update={updateContent} />}
          {(section.type === "publications" || section.type === "additional") && <ExtraFields doc={doc} update={updateContent} type={section.type} />}
          {section.type === "languages" && <LanguagesFields doc={doc} update={updateContent} />}
          {section.type === "portfolio" && <PortfolioFields doc={doc} update={updateContent} />}
          {section.type === "achievements" && (
            <AchievementsFields doc={doc} update={updateContent} role={role} />
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <Button variant="ghost" size="icon"
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="w-7 h-7 rounded-md flex items-center justify-center text-foreground/55 hover:text-foreground hover:bg-foreground/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
    >
      {children}
    </Button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10.5px] uppercase tracking-[0.16em] text-foreground/45">
      {children}
    </label>
  );
}

function SummaryFields({
  doc,
  update,
  role,
}: {
  doc: ResumeDocument;
  update: (p: Partial<ResumeDocument["content"]>) => void;
  role?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <FieldLabel>Summary</FieldLabel>
        <AiActionsButton
          variant="summary"
          text={doc.content.summary}
          role={role}
          onApply={(text) => update({ summary: text })}
        />
      </div>
      <Textarea
        rows={4}
        placeholder="3–4 sentences. Role identity, top skills, one differentiator."
        value={doc.content.summary}
        onChange={(e) => update({ summary: e.target.value })}
      />
    </div>
  );
}

function SkillsFields({
  doc,
  update,
}: {
  doc: ResumeDocument;
  update: (p: Partial<ResumeDocument["content"]>) => void;
}) {
  const groups = doc.content.skills;
  const setGroups = (g: typeof groups) => update({ skills: g });

  return (
    <div className="space-y-3">
      {groups.map((g, gi) => (
        <div key={g.id} className="rounded-xl border border-border/40 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Input
              value={g.name}
              onChange={(e) =>
                setGroups(groups.map((x, i) => (i === gi ? { ...x, name: e.target.value } : x)))
              }
              placeholder="Group (e.g. Languages)"
              className="h-8 text-[12.5px] max-w-[220px]"
            />
            <button
              onClick={() => setGroups(groups.filter((_, i) => i !== gi))}
              className="ml-auto text-[11px] text-foreground/55 hover:text-rose-400"
            >
              Remove group
            </button>
          </div>
          <Input
            placeholder="Comma-separated skills (e.g. Python, SQL, Pandas, Tableau)"
            value={g.items.join(", ")}
            onChange={(e) =>
              setGroups(
                groups.map((x, i) =>
                  i === gi
                    ? {
                        ...x,
                        items: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }
                    : x,
                ),
              )
            }
            className="h-9 text-[13px]"
          />
        </div>
      ))}
      <button
        onClick={() => setGroups([...groups, { id: newId(), name: "Tools", items: [] }])}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-foreground/[0.1] bg-foreground/[0.04] text-[11.5px] text-foreground/75 hover:bg-foreground/[0.07]"
      >
        <Plus className="w-3 h-3" /> Add skill group
      </button>
    </div>
  );
}

function ExperienceFields({
  doc,
  update,
  role,
}: {
  doc: ResumeDocument;
  update: (p: Partial<ResumeDocument["content"]>) => void;
  role?: string;
}) {
  const items = doc.content.experience;
  const set = (next: typeof items) => update({ experience: next });
  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={it.id} className="rounded-xl border border-border/40 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Role (e.g. Data Analyst)"
              value={it.role}
              onChange={(e) => set(items.map((x, i) => (i === idx ? { ...x, role: e.target.value } : x)))}
            />
            <Input
              placeholder="Company"
              value={it.company}
              onChange={(e) =>
                set(items.map((x, i) => (i === idx ? { ...x, company: e.target.value } : x)))
              }
            />
            <Input
              placeholder="Location"
              value={it.location}
              onChange={(e) =>
                set(items.map((x, i) => (i === idx ? { ...x, location: e.target.value } : x)))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Start (e.g. Jan 2023)"
                value={it.start}
                onChange={(e) =>
                  set(items.map((x, i) => (i === idx ? { ...x, start: e.target.value } : x)))
                }
              />
              <Input
                placeholder="End"
                value={it.end}
                onChange={(e) =>
                  set(items.map((x, i) => (i === idx ? { ...x, end: e.target.value } : x)))
                }
              />
            </div>
          </div>

          <BulletList
            bullets={it.bullets}
            onChange={(bullets) =>
              set(items.map((x, i) => (i === idx ? { ...x, bullets } : x)))
            }
            role={role}
          />

          <button
            onClick={() => set(items.filter((_, i) => i !== idx))}
            className="text-[11px] text-foreground/55 hover:text-rose-400"
          >
            Remove experience
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          set([
            ...items,
            { id: newId(), role: "", company: "", location: "", start: "", end: "", bullets: [""] },
          ])
        }
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-foreground/[0.1] bg-foreground/[0.04] text-[11.5px] text-foreground/75 hover:bg-foreground/[0.07]"
      >
        <Plus className="w-3 h-3" /> Add experience
      </button>
    </div>
  );
}

function ProjectsFields({
  doc,
  update,
  role,
}: {
  doc: ResumeDocument;
  update: (p: Partial<ResumeDocument["content"]>) => void;
  role?: string;
}) {
  const items = doc.content.projects;
  const set = (next: typeof items) => update({ projects: next });
  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={it.id} className="rounded-xl border border-border/40 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Project name"
              value={it.name}
              onChange={(e) => set(items.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
            />
            <Input
              placeholder="Link (optional)"
              value={it.link}
              onChange={(e) => set(items.map((x, i) => (i === idx ? { ...x, link: e.target.value } : x)))}
            />
          </div>
          <Textarea
            rows={2}
            placeholder="One-line description (optional)"
            value={it.description}
            onChange={(e) =>
              set(items.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))
            }
          />
          <BulletList
            bullets={it.bullets}
            onChange={(bullets) => set(items.map((x, i) => (i === idx ? { ...x, bullets } : x)))}
            role={role}
          />
          <button
            onClick={() => set(items.filter((_, i) => i !== idx))}
            className="text-[11px] text-foreground/55 hover:text-rose-400"
          >
            Remove project
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          set([
            ...items,
            { id: newId(), name: "", link: "", description: "", bullets: [""] },
          ])
        }
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-foreground/[0.1] bg-foreground/[0.04] text-[11.5px] text-foreground/75 hover:bg-foreground/[0.07]"
      >
        <Plus className="w-3 h-3" /> Add project
      </button>
    </div>
  );
}

function EducationFields({
  doc,
  update,
}: {
  doc: ResumeDocument;
  update: (p: Partial<ResumeDocument["content"]>) => void;
}) {
  const items = doc.content.education;
  const set = (next: typeof items) => update({ education: next });
  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={it.id} className="rounded-xl border border-border/40 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Degree (e.g. B.Tech CSE)"
              value={it.degree}
              onChange={(e) => set(items.map((x, i) => (i === idx ? { ...x, degree: e.target.value } : x)))}
            />
            <Input
              placeholder="School / University"
              value={it.school}
              onChange={(e) => set(items.map((x, i) => (i === idx ? { ...x, school: e.target.value } : x)))}
            />
            <Input
              placeholder="Location"
              value={it.location}
              onChange={(e) =>
                set(items.map((x, i) => (i === idx ? { ...x, location: e.target.value } : x)))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Start"
                value={it.start}
                onChange={(e) =>
                  set(items.map((x, i) => (i === idx ? { ...x, start: e.target.value } : x)))
                }
              />
              <Input
                placeholder="End"
                value={it.end}
                onChange={(e) =>
                  set(items.map((x, i) => (i === idx ? { ...x, end: e.target.value } : x)))
                }
              />
            </div>
          </div>
          <Input
            placeholder="GPA / honors / coursework (optional)"
            value={it.details}
            onChange={(e) => set(items.map((x, i) => (i === idx ? { ...x, details: e.target.value } : x)))}
          />
          <button
            onClick={() => set(items.filter((_, i) => i !== idx))}
            className="text-[11px] text-foreground/55 hover:text-rose-400"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          set([
            ...items,
            { id: newId(), degree: "", school: "", location: "", start: "", end: "", details: "" },
          ])
        }
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-foreground/[0.1] bg-foreground/[0.04] text-[11.5px] text-foreground/75 hover:bg-foreground/[0.07]"
      >
        <Plus className="w-3 h-3" /> Add education
      </button>
    </div>
  );
}

function CertFields({
  doc,
  update,
}: {
  doc: ResumeDocument;
  update: (p: Partial<ResumeDocument["content"]>) => void;
}) {
  const items = doc.content.certifications;
  const set = (next: typeof items) => update({ certifications: next });
  return (
    <div className="space-y-2">
      {items.map((it, idx) => (
        <div key={it.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            placeholder="Certification name"
            value={it.name}
            onChange={(e) => set(items.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
          />
          <Input
            placeholder="Issuer"
            value={it.issuer}
            onChange={(e) => set(items.map((x, i) => (i === idx ? { ...x, issuer: e.target.value } : x)))}
          />
          <Input
            placeholder="Date"
            value={it.date}
            onChange={(e) => set(items.map((x, i) => (i === idx ? { ...x, date: e.target.value } : x)))}
          />
          <Input aria-label="Certification expiry" placeholder="Expiry (optional)" value={it.expiry ?? ""} onChange={e=>set(items.map((x,i)=>i===idx?{...x,expiry:e.target.value}:x))} />
          <Input aria-label="Credential link" placeholder="Credential link (optional)" value={it.url ?? ""} onChange={e=>set(items.map((x,i)=>i===idx?{...x,url:e.target.value}:x))} />
          <button
            onClick={() => set(items.filter((_, i) => i !== idx))}
            className="text-foreground/50 hover:text-rose-400 flex items-center justify-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={() => set([...items, { id: newId(), name: "", issuer: "", date: "" }])}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-foreground/[0.1] bg-foreground/[0.04] text-[11.5px] text-foreground/75 hover:bg-foreground/[0.07]"
      >
        <Plus className="w-3 h-3" /> Add certification
      </button>
    </div>
  );
}

function AchievementsFields({
  doc,
  update,
  role,
}: {
  doc: ResumeDocument;
  update: (p: Partial<ResumeDocument["content"]>) => void;
  role?: string;
}) {
  return (
    <BulletList
      bullets={doc.content.achievements}
      onChange={(achievements) => update({ achievements })}
      role={role}
      placeholder="Awards, honors, public recognition…"
    />
  );
}

function ExtraFields({doc,update,type}:{doc:ResumeDocument;update:(p:Partial<ResumeDocument["content"]>)=>void;type:"publications"|"additional"}) {
  const items=doc.content[type]??[];
  const set=(next:typeof items)=>type==="additional"?update({additional:next.map(x=>({...x,kind:"kind" in x?String(x.kind):"other"}))}):update({publications:next});
  return <div className="space-y-3">{items.map((it,i)=><div key={it.id} className="space-y-2"><Input aria-label={`${type} title`} value={it.title} placeholder="Title" onChange={e=>set(items.map((x,j)=>j===i?{...x,title:e.target.value}:x))}/><Textarea aria-label={`${type} details`} value={it.details} placeholder="Details" rows={3} onChange={e=>set(items.map((x,j)=>j===i?{...x,details:e.target.value}:x))}/><Button size="sm" variant="ghost" onClick={()=>set(items.filter((_,j)=>j!==i))}><Trash2 className="size-4"/>Remove</Button></div>)}<Button variant="outline" size="sm" onClick={()=>set([...items,{id:newId(),title:"",details:""}])}><Plus className="size-4"/>Add entry</Button></div>;
}

function BulletList({
  bullets,
  onChange,
  role,
  placeholder,
}: {
  bullets: string[];
  onChange: (next: string[]) => void;
  role?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      {bullets.map((b, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-foreground/40 mt-2 select-none">·</span>
          <Textarea
            rows={1}
            placeholder={placeholder ?? "Action verb · what · scope · result"}
            value={b}
            onChange={(e) => onChange(bullets.map((x, j) => (j === i ? e.target.value : x)))}
            className="min-h-[34px] py-1.5 text-[13px]"
          />
          <div className="flex flex-col gap-1 pt-1">
            <AiActionsButton
              size="xs"
              variant="bullet"
              text={b}
              role={role}
              onApply={(t) => onChange(bullets.map((x, j) => (j === i ? t : x)))}
            />
            <button
              onClick={() => onChange(bullets.filter((_, j) => j !== i))}
              className="w-7 h-6 rounded-md text-foreground/45 hover:text-rose-400 flex items-center justify-center"
              title="Remove bullet"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={() => onChange([...bullets, ""])}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-foreground/[0.1] bg-foreground/[0.04] text-[11.5px] text-foreground/75 hover:bg-foreground/[0.07]"
      >
        <Plus className="w-3 h-3" /> Add bullet
      </button>
    </div>
  );
}
