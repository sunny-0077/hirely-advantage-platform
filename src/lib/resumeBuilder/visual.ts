import type { FontPairing, ResumeDocument, ResumePalette, ResumeStyle, RoleArchetype, SectionType, VisualLayout } from "./types";
import { DEFAULT_SECTION_NAME } from "./types";

export const PALETTES: { id: ResumePalette; label: string }[] = [
  { id: "navy", label: "Navy & Sky" }, { id: "slate", label: "Slate & Indigo" },
  { id: "emerald", label: "Emerald & Charcoal" }, { id: "terracotta", label: "Terracotta" },
  { id: "violet", label: "Royal Violet" }, { id: "mono", label: "Monochrome" },
  { id: "crimson", label: "Crimson & Slate" }, { id: "teal", label: "Clinical Teal" },
];
export const FONT_PAIRINGS: { id: FontPairing; label: string }[] = [
  { id: "modern", label: "Modern & Clean · Plus Jakarta + Inter" }, { id: "classic", label: "Executive · Playfair + Lora" },
  { id: "tech", label: "Tech · Space Grotesk + JetBrains Mono" }, { id: "editorial", label: "Contemporary · Outfit + DM Sans" },
];
export const VISUAL_LAYOUTS: { id: RoleArchetype; label: string; palette: ResumePalette; fontPairing: FontPairing; order: SectionType[] }[] = [
  { id: "tech", label: "Tech & Engineering", palette: "slate", fontPairing: "tech", order: ["summary", "skills", "projects", "experience", "education", "certifications", "achievements", "languages", "portfolio", "publications", "additional"] },
  { id: "creative", label: "Creative & Design", palette: "terracotta", fontPairing: "editorial", order: ["summary", "portfolio", "projects", "experience", "skills", "education", "achievements", "certifications", "languages", "publications", "additional"] },
  { id: "executive", label: "Executive & Finance", palette: "emerald", fontPairing: "classic", order: ["summary", "experience", "achievements", "skills", "education", "certifications", "projects", "publications", "languages", "portfolio", "additional"] },
  { id: "sales", label: "Sales & Product", palette: "navy", fontPairing: "modern", order: ["summary", "achievements", "experience", "skills", "projects", "education", "certifications", "languages", "portfolio", "publications", "additional"] },
  { id: "healthcare", label: "Healthcare & Science", palette: "teal", fontPairing: "modern", order: ["summary", "certifications", "experience", "education", "publications", "skills", "projects", "achievements", "languages", "portfolio", "additional"] },
  { id: "student", label: "Student & Fresher", palette: "violet", fontPairing: "modern", order: ["summary", "education", "projects", "skills", "experience", "achievements", "certifications", "languages", "portfolio", "publications", "additional"] },
  { id: "ats", label: "Classic ATS", palette: "mono", fontPairing: "classic", order: ["summary", "experience", "education", "skills", "projects", "certifications", "achievements", "publications", "languages", "portfolio", "additional"] },
];
export const RESUME_STYLES: { id: ResumeStyle; label: string; fontPairing: FontPairing }[] = [
  { id: "modern-two-column", label: "Modern Two-Column", fontPairing: "modern" },
  { id: "clean-minimalist", label: "Clean Minimalist", fontPairing: "modern" },
  { id: "executive-single-column", label: "Executive Single-Column", fontPairing: "classic" },
  { id: "bold-accent-header", label: "Bold Accent Header", fontPairing: "editorial" },
  { id: "compact-high-density", label: "Compact High-Density", fontPairing: "modern" },
];
export type RoleContext = { title?: string; occupationTitle?: string; industryId?: string; blueprintId?: string; levelId?: string };
export function classifyRole({ title = "", occupationTitle = "", industryId = "", blueprintId = "", levelId = "" }: RoleContext): RoleArchetype {
  if (["student", "internship", "graduate", "fresher", "entry-level"].includes(levelId)) return "student";
  const text = `${occupationTitle} ${title} ${industryId}`.toLowerCase();
  if (/\b(nurse|doctor|physician|surgeon|dentist|therapist|pharmacist|teacher|professor|researcher|scientist|clinical|healthcare|biolog|chemist)\b/.test(text) && !/data scient|computer scient/.test(text)) return "healthcare";
  if (/\b(product manager|product owner|sales|customer success|account manager|business development)\b/.test(text)) return "sales";
  if (/\b(design|designer|creative|artist|animator|video|editor|writer|marketing|marketer|content|photographer)\b/.test(text) && !/hardware|circuit|mechanical/.test(text)) return "creative";
  if (/\b(finance|financial|accountant|lawyer|legal|consultant|hr|human resources|executive|chief|director|operations)\b/.test(text)) return "executive";
  if (blueprintId === "clinical" || blueprintId === "research") return "healthcare";
  if (blueprintId === "technical" || /software|engineer|devops|data scien|developer|cybersecurity|cloud|telecommunicat/.test(text)) return "tech";
  if (blueprintId === "creative") return "creative";
  if (blueprintId === "advisory" || blueprintId === "operations") return "executive";
  return "sales";
}
export function layoutMeta(layout: VisualLayout) { return VISUAL_LAYOUTS.find(x => x.id === layout) ?? VISUAL_LAYOUTS[0]; }
export function isResumeStyle(layout: VisualLayout): layout is ResumeStyle { return RESUME_STYLES.some(s => s.id === layout); }
export function recommendedStyle(archetype: RoleArchetype): ResumeStyle {
  if (archetype === "tech") return "modern-two-column";
  if (archetype === "creative" || archetype === "sales") return "bold-accent-header";
  if (archetype === "executive" || archetype === "ats") return "executive-single-column";
  return "clean-minimalist";
}
export function styleForLayout(layout: VisualLayout): ResumeStyle | "ats" {
  return isResumeStyle(layout) ? layout : layout === "ats" ? "ats" : recommendedStyle(layout);
}
export function styleLabel(layout: VisualLayout): string {
  return RESUME_STYLES.find(s => s.id === styleForLayout(layout))?.label ?? "Classic ATS";
}
export function resolvedLayout(doc: ResumeDocument): VisualLayout {
  return doc.presentation?.layout ?? (doc.templateId.includes("fresher") ? "student" : doc.templateId.includes("engineer") || doc.templateId === "data-analyst" ? "tech" : "ats");
}
export function resolvedArchetype(doc: ResumeDocument): RoleArchetype {
  if (doc.presentation?.archetype) return doc.presentation.archetype;
  const layout = resolvedLayout(doc);
  return isResumeStyle(layout) ? classifyRole({ title: doc.content.personal.headline }) : layout;
}
export function resolvedPairing(doc: ResumeDocument): FontPairing {
  return doc.presentation?.fontPairing ?? (doc.settings.fontFamily === "Times" || doc.settings.fontFamily === "Georgia" ? "classic" : "modern");
}
export function resolvedPalette(doc: ResumeDocument): ResumePalette { return doc.presentation?.palette ?? layoutMeta(resolvedArchetype(doc)).palette; }
export function applyVisualLayout(doc: ResumeDocument, layout: VisualLayout, resetStyle = false): ResumeDocument {
  const archetype = isResumeStyle(layout) || (layout === "ats" && doc.presentation?.archetype) ? resolvedArchetype(doc) : layout;
  const meta = layoutMeta(archetype);
  const style = RESUME_STYLES.find(s => s.id === layout);
  const sections = isResumeStyle(layout) && !resetStyle ? [...doc.sections] : meta.order.map(type => doc.sections.find(s => s.type === type) ?? { id: `visual-${type}`, type, name: DEFAULT_SECTION_NAME[type], enabled: true });
  for (const s of doc.sections) if (!sections.some(x => x.id === s.id)) sections.push(s);
  return { ...doc, sections, presentation: { headerAlign: "left", headingRule: true, ...doc.presentation, layout, archetype, ...(resetStyle ? { palette: meta.palette, fontPairing: style?.fontPairing ?? meta.fontPairing } : {}) } };
}
export function moveResumeSection(doc: ResumeDocument, id: string, direction: -1 | 1): ResumeDocument {
  const index = doc.sections.findIndex(s => s.id === id), target = index + direction;
  if (index < 0 || target < 0 || target >= doc.sections.length) return doc;
  const sections = [...doc.sections]; [sections[index], sections[target]] = [sections[target], sections[index]];
  return { ...doc, sections };
}
export function hasResumeFacts(doc: ResumeDocument): boolean {
  const c = doc.content;
  return Boolean(c.personal.name || c.summary || c.experience.length || c.education.length || c.projects.length || c.certifications.length || c.skills.some(s => s.items.length) || c.achievements.length || c.publications?.length || c.additional?.length);
}
export function safeResumeUrl(value: string): string | undefined {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}