import { describe, expect, it } from "vitest";
import { emptyDocument } from "./templates";
import { roleExample } from "./examples";
import { applyLibraryTemplate, roleStyleDesigns, validateDocument, type Design, type LibrarySelection } from "./library";
import { applyVisualLayout, moveResumeSection, RESUME_STYLES, resolvedArchetype } from "./visual";

const base: Design = { id: "modern", label: "Modern", version: 1, definition: { fontFamily: "Arial", fontSize: 11, spacing: "normal", accent: "#111827", headerAlign: "left", headingRule: true } };
const roleSelection = (design: Design, title = "Software Engineer", levelId = "experienced", blueprintId = "technical"): LibrarySelection => ({ titleId: "catalogue-title", title, occupationId: "catalogue-occupation", levelId, blueprint: { id: blueprintId, label: "Professional", version: 1, definition: { order: ["summary", "experience", "skills"], guidance: [], summaryPrompt: "" } }, design });

describe("role-specific design styles", () => {
  it.each(["Software Engineer", "Registered Nurse", "Financial Analyst", "UX Designer", "Civil Engineer", "Electrician"])("offers exactly the five agreed structures for %s without industry buckets", title => {
    const designs = roleStyleDesigns(base, { title });
    expect(designs.map(d => d.definition.layout)).toEqual(["modern-two-column", "clean-minimalist", "executive-single-column", "bold-accent-header", "compact-high-density"]);
    expect(new Set(designs.map(d => d.definition.layout)).size).toBe(5);
    expect(designs.every(d => d.id === "modern")).toBe(true);
  });
  it("uses the selected canonical occupation for every style rather than changing profession with appearance", () => {
    const designs = roleStyleDesigns(base, { title: "Pediatrician", occupationTitle: "Physicians, Pediatric", blueprintId: "clinical" });
    const example = roleExample("Pediatrician", "healthcare", "Physicians, Pediatric", { title: "Physicians, Pediatric", tasks: ["Examine children and interpret diagnostic tests."], skills: ["Patient assessment", "Clinical documentation"] });
    for (const design of designs) {
      const doc = applyLibraryTemplate(example, roleSelection(design, "Pediatrician", "experienced", "clinical"));
      expect(doc.content.personal.headline).toBe("Pediatrician");
      expect(doc.content.skills[0].items).toEqual(["Patient assessment", "Clinical documentation"]);
      expect(doc.content.experience[0].bullets[0]).toContain("Examine children and interpret diagnostic tests.");
      expect(doc.sections.findIndex(s => s.type === "certifications")).toBeLessThan(doc.sections.findIndex(s => s.type === "experience"));
      expect(doc.presentation?.palette).toBe("teal");
    }
  });
  it.each(RESUME_STYLES)("keeps career facts, hidden sections, links and original snapshot in $id", style => {
    const doc = roleExample("Software Engineer", "tech");
    doc.sourceSnapshot = { source: "actual facts" };
    const projects = doc.sections.find(s => s.type === "projects");
    if (projects) projects.enabled = false;
    const design = roleStyleDesigns(base, { title: "Software Engineer", blueprintId: "technical" }).find(d => d.definition.layout === style.id);
    if (!design) throw new Error("Missing style");
    const next = applyLibraryTemplate(doc, roleSelection(design));
    expect(next.content).toEqual(doc.content);
    expect(next.sourceSnapshot).toEqual(doc.sourceSnapshot);
    expect(next.sections.find(s => s.type === "projects")?.enabled).toBe(false);
    expect(validateDocument(JSON.parse(JSON.stringify(next))).presentation?.layout).toBe(style.id);
  });
  it("never inserts illustrative facts when a blank draft switches styles", () => {
    for (const design of roleStyleDesigns(base, { title: "Nurse" })) {
      const doc = applyLibraryTemplate(emptyDocument("classic-ats"), roleSelection(design));
      expect(doc.content.experience).toEqual([]);
      expect(doc.content.summary).toBe("");
      expect(doc.presentation?.example).toBeUndefined();
    }
  });
  it.each(RESUME_STYLES)("preserves a graduate's education-first priority in $id", style => {
    const design = roleStyleDesigns(base, { title: "Engineer", levelId: "graduate" }).find(d => d.definition.layout === style.id);
    if (!design) throw new Error("Missing style");
    const doc = applyLibraryTemplate(emptyDocument("classic-ats"), roleSelection(design, "Engineer", "graduate"));
    expect(doc.sections[1].type).toBe("education");
    expect(resolvedArchetype(doc)).toBe("student");
  });
  it("retains the role's palette and user-selected fonts when switching styles in the toolbar", () => {
    let doc = applyLibraryTemplate(roleExample("Nurse", "healthcare"), roleSelection(roleStyleDesigns(base, { title: "Nurse", blueprintId: "clinical" })[0], "Nurse", "experienced", "clinical"));
    doc.presentation = { ...doc.presentation, headerAlign: "left", headingRule: true, palette: "crimson", fontPairing: "editorial" };
    for (const style of RESUME_STYLES) {
      doc = applyVisualLayout(doc, style.id);
      expect(doc.presentation?.palette).toBe("crimson");
      expect(doc.presentation?.fontPairing).toBe("editorial");
      expect(resolvedArchetype(doc)).toBe("healthcare");
    }
  });
  it("loads legacy saved layouts without changing their content or structure", () => {
    for (const layout of ["tech", "creative", "executive", "sales", "healthcare", "student", "ats"] as const) {
      const doc = roleExample("Existing role", layout);
      expect(validateDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
    }
  });
  it("keeps section reordering when switching among the five styles", () => {
    const doc = moveResumeSection(roleExample("Software Engineer", "tech"), "visual-projects", -1);
    for (const style of RESUME_STYLES) expect(applyVisualLayout(doc, style.id).sections).toEqual(doc.sections);
    expect(doc.sections[1].type).toBe("projects");
  });
  it("retains the profession when switching through Classic ATS and back", () => {
    const doc = applyVisualLayout(applyVisualLayout(roleExample("Nurse", "healthcare"), "ats"), "bold-accent-header");
    expect(resolvedArchetype(doc)).toBe("healthcare");
    expect(doc.content.personal.headline).toBe("Nurse");
  });
});