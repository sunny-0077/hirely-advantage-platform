import type { ReactNode } from "react";
import { Award, BriefcaseBusiness, Code2, ExternalLink, GraduationCap, Languages, Layers, Mail, MapPin, Phone, BookOpen, UserRound, Link as LinkIcon } from "lucide-react";
import type { ResumeDocument, SectionType, VisualLayout } from "@/lib/resumeBuilder/types";
import { buildRenderModel, dateRange, type RenderedSection } from "@/lib/resumeBuilder/render";
import { splitResumeText } from "@/lib/resumeBuilder/pagination";
import { resolvedArchetype, resolvedLayout, resolvedPairing, resolvedPalette, safeResumeUrl } from "@/lib/resumeBuilder/visual";

export type ResumeBlock = { id: string; type: SectionType; node: ReactNode };
const icons: Record<SectionType, typeof Award> = { summary: UserRound, skills: Code2, experience: BriefcaseBusiness, projects: Layers, education: GraduationCap, certifications: Award, achievements: Award, publications: BookOpen, additional: UserRound, languages: Languages, portfolio: LinkIcon };
function MetricText({ text, highlight }: { text: string; highlight: boolean }) {
  if (!highlight) return <>{text}</>;
  return <>{text.split(/((?:[$€£₹]\s*)?\d[\d,.]*(?:\s?%|\s?[kKmM])?)/g).map((part, i) => /\d/.test(part) ? <mark key={i}>{part}</mark> : part)}</>;
}
function Bullet({ text, layout }: { text: string; layout: VisualLayout }) { return <p className="resume-bullet"><span><MetricText text={text} highlight={["executive", "sales", "executive-single-column", "bold-accent-header"].includes(layout)} /></span></p>; }
function Title({ title, dates }: { title: string; dates?: string }) { return <div className="resume-entry-title"><h3>{title}</h3>{dates && <time>{dates}</time>}</div>; }
function ItemNodes(sec: RenderedSection, layout: VisualLayout): ReactNode[] {
  switch (sec.type) {
    case "summary": return splitResumeText(sec.text, 600).map((text, i) => <p key={i}>{text}</p>);
    case "skills": return sec.groups.flatMap((g, gi) => {
      const chunks = Array.from({ length: Math.ceil(g.items.length / 12) }, (_, i) => g.items.slice(i * 12, i * 12 + 12));
      return chunks.map((items, i) => <div key={`${gi}-${i}`}><div className="resume-skill-group-label">{g.name}{i > 0 ? " · continued" : ""}</div>{["ats", "executive", "executive-single-column", "clean-minimalist", "compact-high-density"].includes(layout) ? <p>{items.join(" · ")}</p> : <div className="resume-badges">{items.map((item, n) => <span key={n} className="resume-badge">{item}</span>)}</div>}</div>);
    });
    case "experience": return sec.items.flatMap(it => {
      const bullets = it.bullets.filter(Boolean).flatMap(b => splitResumeText(b));
      return [<div key={it.id}><Title title={it.role} dates={dateRange(it.start, it.end)} /><div className="resume-meta">{[it.company, it.location, it.employmentType].filter(Boolean).join(" · ")}</div>{bullets[0] && <Bullet text={bullets[0]} layout={layout} />}</div>, ...bullets.slice(1).map((b, i) => <Bullet key={`${it.id}-${i}`} text={b} layout={layout} />)];
    });
    case "projects": return sec.items.flatMap(it => {
      const descriptions = splitResumeText(it.description), bullets = it.bullets.filter(Boolean).flatMap(b => splitResumeText(b));
      const links = it.link.split(/\s+\|\s+/).filter(Boolean);
      return [<div key={it.id}><Title title={it.name} /><div className="resume-meta">{links.map((link, i) => <div key={i}><a href={safeResumeUrl(link)} target="_blank" rel="noreferrer">{link}</a></div>)}</div>{descriptions[0] && <p>{descriptions[0]}</p>}{!descriptions.length && bullets[0] && <Bullet text={bullets[0]} layout={layout} />}</div>, ...descriptions.slice(1).map((d, i) => <p key={`${it.id}-d-${i}`}>{d}</p>), ...bullets.slice(descriptions.length ? 0 : 1).map((b, i) => <Bullet key={`${it.id}-b-${i}`} text={b} layout={layout} />)];
    });
    case "education": return sec.items.flatMap(it => {
      const details = splitResumeText(it.details);
      return [<div key={it.id}><Title title={it.degree} dates={dateRange(it.start, it.end)} /><div className="resume-meta">{[it.school, it.location].filter(Boolean).join(" · ")}</div>{details[0] && <p>{details[0]}</p>}</div>, ...details.slice(1).map((d, i) => <p key={`${it.id}-${i}`}>{d}</p>)];
    });
    case "certifications": return sec.items.map(it => <div key={it.id}><Title title={it.name} /><div className="resume-meta">{[it.issuer, it.date, it.expiry ? `Expires ${it.expiry}` : ""].filter(Boolean).join(" · ")}</div>{it.url && <a className="resume-meta" href={safeResumeUrl(it.url)}>{it.url}</a>}</div>);
    case "achievements": return sec.items.flatMap(a => splitResumeText(a)).map((a, i) => <Bullet key={i} text={a} layout={layout} />);
    case "portfolio": return sec.items.map((it, i) => <div className="resume-portfolio" key={i}><strong>{it.label || "Portfolio"}</strong><p><a href={safeResumeUrl(it.url)} target="_blank" rel="noreferrer">{it.url}</a></p></div>);
    case "publications": case "additional": case "languages": return sec.items.flatMap(it => {
      const details = splitResumeText(it.details);
      return [<div key={it.id}><Title title={it.title} />{details[0] && <p>{details[0]}</p>}</div>, ...details.slice(1).map((d, i) => <p key={`${it.id}-${i}`}>{d}</p>)];
    });
  }
}
export function buildVisualBlocks(doc: ResumeDocument): ResumeBlock[] {
  const layout = resolvedLayout(doc);
  const archetype = resolvedArchetype(doc);
  return buildRenderModel(doc).flatMap((sec, index) => {
    const Icon = icons[sec.type];
    // Only default section names adapt; deliberate user heading choices stay intact.
    const defaultNames: Partial<Record<SectionType, string>> = archetype === "tech" ? { skills: "Technical Stack & Tools", projects: "Key Projects" } : archetype === "sales" ? { achievements: "Key Impact & KPI Highlights", skills: "Core Competencies" } : archetype === "healthcare" ? { certifications: "Licenses & Certifications" } : archetype === "student" ? { projects: "Academic Projects", achievements: "Awards & Leadership" } : {};
    const name = defaultNames[sec.type] && ["Skills", "Projects", "Achievements", "Certifications"].includes(sec.name) ? defaultNames[sec.type] : sec.name;
    return ItemNodes(sec, layout).map((node, i) => ({ id: `${index}-${sec.type}-${i}`, type: sec.type, node: <>{i === 0 && <h2><Icon size={13} />{name}</h2>}{node}</> }));
  });
}
export function splitVisualColumns(blocks: ResumeBlock[], layout: VisualLayout) {
  const railTypes: SectionType[] = layout === "creative" ? ["skills", "education", "certifications", "languages", "additional"] : ["skills", "education", "certifications", "languages", "portfolio", "additional"];
  const columns = ["tech", "creative", "modern-two-column", "compact-high-density"].includes(layout);
  return { main: blocks.filter(b => !columns || !railTypes.includes(b.type)), rail: columns ? blocks.filter(b => railTypes.includes(b.type)) : [] };
}
function Header({ doc }: { doc: ResumeDocument }) {
  const p = doc.content.personal;
  return <header className="resume-header" data-resume-header>
    <span className="resume-monogram" aria-hidden="true">{(p.name || "Your Name").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("")}</span>
    <h1>{p.name || "Your Name"}</h1>{p.headline && <div className="resume-headline">{p.headline}</div>}
    <div className="resume-contact">{p.email && <a href={`mailto:${p.email}`}><Mail />{p.email}</a>}{p.phone && <span><Phone />{p.phone}</span>}{p.location && <span><MapPin />{p.location}</span>}</div>
    {p.links.length > 0 && <div className="resume-links">{p.links.filter(l => l.url).map((l, i) => <a key={i} className="resume-link-chip" href={safeResumeUrl(l.url)} target="_blank" rel="noreferrer"><ExternalLink />{l.label || l.url}</a>)}</div>}
  </header>;
}
function Flow({ blocks, rail = false }: { blocks: ResumeBlock[]; rail?: boolean }) {
  return <div className={rail ? "resume-flow resume-rail" : "resume-flow resume-main"} data-resume-flow={rail ? "rail" : "main"}>{blocks.map(b => <div key={b.id} data-block-id={b.id} data-section-type={b.type} className="resume-flow-block">{b.node}</div>)}</div>;
}
type PageProps = { doc: ResumeDocument; main: ResumeBlock[]; rail: ResumeBlock[]; page?: number; total?: number; measure?: boolean };
function PageFrame({ doc, main, rail, page = 0, total = 1, measure = false }: PageProps) {
  const layout = resolvedLayout(doc);
  return <article className={`resume-page resume-layout-${layout}`} data-resume-page={measure ? undefined : page + 1} data-resume-layout={layout} data-resume-palette={resolvedPalette(doc)} data-font-pairing={resolvedPairing(doc)} data-spacing={doc.settings.spacing} style={{ "--resume-font-size": `${doc.settings.fontSize * 4 / 3}px` } as React.CSSProperties}>
    {page === 0 ? <Header doc={doc} /> : <div className="resume-continuation" data-resume-header>{doc.content.personal.name || "Resume"} · {doc.content.personal.headline}</div>}
    <div className="resume-columns">{["tech", "creative", "modern-two-column"].includes(layout) && <Flow blocks={rail} rail />}<Flow blocks={main} />{layout === "compact-high-density" && <Flow blocks={rail} rail />}</div>
    {!measure && <footer className="resume-footer"><span>{doc.presentation?.example ? "Illustrative example" : doc.content.personal.name}</span><span>{page + 1} / {total}</span></footer>}
  </article>;
}
// Separate archetypes share content blocks, never a separately reconstructed export.
export const TechResume = (props: PageProps) => <PageFrame {...props} />;
export const CreativeResume = (props: PageProps) => <PageFrame {...props} />;
export const ExecutiveResume = (props: PageProps) => <PageFrame {...props} />;
export const SalesResume = (props: PageProps) => <PageFrame {...props} />;
export const HealthcareResume = (props: PageProps) => <PageFrame {...props} />;
export const StudentResume = (props: PageProps) => <PageFrame {...props} />;
export function VisualResumePage(props: PageProps) {
  const layouts: Record<VisualLayout, typeof PageFrame> = { tech: TechResume, creative: CreativeResume, executive: ExecutiveResume, sales: SalesResume, healthcare: HealthcareResume, student: StudentResume, ats: PageFrame, "modern-two-column": PageFrame, "clean-minimalist": PageFrame, "executive-single-column": PageFrame, "bold-accent-header": PageFrame, "compact-high-density": PageFrame };
  const Component = layouts[resolvedLayout(props.doc)]; return <Component {...props} />;
}