import { describe, expect, it } from "vitest";
import { emptyDocument } from "./templates";
import { applyLibraryTemplate, validateDocument, type LibrarySelection } from "./library";
import { applyVisualLayout, classifyRole, moveResumeSection, safeResumeUrl, VISUAL_LAYOUTS } from "./visual";
import { roleExample } from "./examples";
import { buildRenderModel } from "./render";
import { paginateMeasurements, splitResumeText } from "./pagination";

describe("role-adaptive resumes", () => {
  it.each([
    ["Software Engineer", "technical", "tech"], ["Data Scientist", "technical", "tech"],
    ["DevOps Engineer", "technical", "tech"], ["UI/UX Designer", "creative", "creative"],
    ["Video Editor", "creative", "creative"], ["Marketing Manager", "creative", "creative"],
    ["Financial Analyst", "advisory", "executive"], ["Human Resources Manager", "business", "executive"],
    ["Product Manager", "business", "sales"], ["Sales Representative", "business", "sales"],
    ["Customer Success Manager", "business", "sales"], ["Registered Nurse", "clinical", "healthcare"],
    ["Secondary School Teacher", "research", "healthcare"], ["Research Scientist", "research", "healthcare"],
  ])("maps %s to its professional design", (title, blueprintId, expected) => {
    expect(classifyRole({ title, blueprintId })).toBe(expected);
  });
  it.each(["student", "internship", "graduate", "fresher", "entry-level"])("prioritizes education for %s careers", levelId => {
    expect(classifyRole({ title: "Software Engineer", blueprintId: "technical", levelId })).toBe("student");
  });
  it("preserves every career fact and hidden section across all six visual structures", () => {
    const doc = roleExample("Software Engineer", "tech"); doc.presentation = { ...doc.presentation, headerAlign: "left", headingRule: true, example: false }; doc.sourceSnapshot = { original: "Actual source" };
    const projects = doc.sections.find(s => s.type === "projects"); if (projects) projects.enabled = false;
    for (const l of VISUAL_LAYOUTS) {
      const next = applyVisualLayout(doc, l.id);
      expect(next.content).toEqual(doc.content); expect(next.sourceSnapshot).toEqual(doc.sourceSnapshot);
      expect(next.sections.find(s => s.type === "projects")?.enabled).toBe(false);
      expect(next.presentation?.example).toBe(false);
    }
  });
  it("switching an empty draft never injects sample qualifications", () => {
    for (const l of VISUAL_LAYOUTS) {
      const doc = applyVisualLayout(emptyDocument("classic-ats"), l.id, true);
      expect(doc.content.experience).toEqual([]); expect(doc.content.skills.flatMap(s => s.items)).toEqual([]);
      expect(doc.content.summary).toBe(""); expect(doc.presentation?.example).toBeUndefined();
    }
  });
  it("keeps explicit examples marked through validation and reloading", () => {
    const doc = roleExample("Registered Nurse", "healthcare"); const next = validateDocument(JSON.parse(JSON.stringify(doc)));
    expect(next.presentation?.example).toBe(true); expect(next.presentation?.layout).toBe("healthcare");
    expect(next.content.personal.headline).toBe("Registered Nurse"); expect(next.content.skills[0].items).toContain("Patient assessment");
  });
  it("adapts examples to the selected title without affecting unrelated user facts", () => {
    expect(roleExample("Data Analyst", "tech").content.skills[0].items).toContain("Power BI");
    expect(roleExample("Financial Analyst", "executive").content.skills[0].items).toContain("Financial reporting");
    expect(roleExample("Product Manager", "sales").content.experience[0].role).toBe("Product Manager");
  });
  it("reorders sections without altering or removing content", () => {
    const doc = applyVisualLayout(emptyDocument("classic-ats"), "student");
    const next = moveResumeSection(doc, doc.sections[1].id, -1);
    expect(next.sections[0].type).toBe("education"); expect(next.content).toEqual(doc.content);
    expect(moveResumeSection(next, next.sections[0].id, -1)).toBe(next);
  });
  it("hides optional languages and portfolio without deleting the underlying facts", () => {
    const doc = roleExample("UX Designer", "creative"); const language = doc.sections.find(s => s.type === "languages"); const portfolio = doc.sections.find(s => s.type === "portfolio");
    if (language) language.enabled = false; if (portfolio) portfolio.enabled = false;
    const model = buildRenderModel(doc);
    expect(model.some(s => s.type === "languages" || s.type === "portfolio")).toBe(false);
    expect(doc.content.additional?.[0].title).toBe("English"); expect(doc.content.personal.links[0].url).toBe("https://example.com/work");
    expect(model.some(s => s.type === "additional")).toBe(false);
  });
  it("rejects unsafe clickable links", () => { expect(safeResumeUrl("javascript:alert(1)")).toBeUndefined(); expect(safeResumeUrl("https://github.com/real/project")).toBe("https://github.com/real/project"); });
});
describe("A4 page planning", () => {
  it("flows blocks onto additional pages without dropping content", () => {
    const pages = paginateMeasurements([{ id: "summary", height: 100 }, { id: "project", height: 250 }, { id: "experience", height: 200 }, { id: "education", height: 100 }], 400, 300);
    expect(pages).toEqual([["summary", "project"], ["experience", "education"]]);
  });
  it("keeps an exact fit on one page", () => { expect(paginateMeasurements([{ id: "one", height: 200 }, { id: "two", height: 200 }], 400, 400)).toEqual([["one", "two"]]); });
  it("splits long input without losing words or metrics", () => {
    const text = "Delivered 30% improvement across 4 engineering teams. ".repeat(50).trim();
    const chunks = splitResumeText(text);
    expect(chunks.length).toBeGreaterThan(1); expect(chunks.join(" ")).toBe(text); expect(chunks.every(c => c.length <= 340)).toBe(true);
  });
});