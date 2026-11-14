import type {
  ExperienceItem,
  ProjectItem,
  EducationItem,
  CertificationItem,
  ResumeDocument,
  Section,
} from "./types";

export type RenderedSection =
  | { type: "summary"; name: string; text: string }
  | { type: "skills"; name: string; groups: { name: string; items: string[] }[] }
  | { type: "experience"; name: string; items: ExperienceItem[] }
  | { type: "projects"; name: string; items: ProjectItem[] }
  | { type: "education"; name: string; items: EducationItem[] }
  | { type: "certifications"; name: string; items: CertificationItem[] }
  | { type: "achievements"; name: string; items: string[] }
  | { type: "portfolio"; name: string; items: { label: string; url: string }[] }
  | { type: "languages"; name: string; items: { id: string; title: string; details: string }[] }
  | { type: "publications" | "additional"; name: string; items: { id: string; title: string; details: string }[] };

/** Returns the resume as an ordered list of populated, enabled sections. */
export function buildRenderModel(doc: ResumeDocument): RenderedSection[] {
  const out: RenderedSection[] = [];
  for (const s of doc.sections) {
    if (!s.enabled) continue;
    const r = renderSection(s, doc);
    if (r) out.push(r);
  }
  return out;
}

function renderSection(s: Section, doc: ResumeDocument): RenderedSection | null {
  const c = doc.content;
  switch (s.type) {
    case "summary":
      return c.summary.trim() ? { type: "summary", name: s.name, text: c.summary.trim() } : null;
    case "skills": {
      const groups = c.skills
        .map((g) => ({ name: g.name, items: g.items.filter(Boolean) }))
        .filter((g) => g.items.length);
      return groups.length ? { type: "skills", name: s.name, groups } : null;
    }
    case "experience":
      return c.experience.length ? { type: "experience", name: s.name, items: c.experience } : null;
    case "projects":
      return c.projects.length ? { type: "projects", name: s.name, items: c.projects } : null;
    case "education":
      return c.education.length ? { type: "education", name: s.name, items: c.education } : null;
    case "certifications":
      return c.certifications.length
        ? { type: "certifications", name: s.name, items: c.certifications }
        : null;
    case "achievements": {
      const items = c.achievements.filter((a) => a.trim());
      return items.length ? { type: "achievements", name: s.name, items } : null;
    }
    case "publications":
    case "additional": {
      const items = (c[s.type] ?? []).filter(a => (a.title || a.details) && (s.type !== "additional" || a.kind !== "language" || !doc.sections.some(x => x.type === "languages")));
      return items.length ? {type:s.type,name:s.name,items} : null;
    }
    case "languages": {
      const items = (c.additional ?? []).filter(a => a.kind === "language" && (a.title || a.details));
      return items.length ? { type: "languages", name: s.name, items } : null;
    }
    case "portfolio": {
      const items = c.personal.links.filter(l => l.url && /portfolio|website|work|behance|dribbble|github/i.test(`${l.label} ${l.url}`));
      return items.length ? { type: "portfolio", name: s.name, items } : null;
    }
  }
}

export function dateRange(start: string, end: string) {
  if (start && end) return `${start} – ${end}`;
  if (start) return `${start} – Present`;
  return end || "";
}
