import { emptyDocument } from "./templates";
import { applyVisualLayout, classifyRole } from "./visual";
import type { ResumeDocument, VisualLayout } from "./types";

// Illustrations only: never called when mapping or switching a user's factual resume.
const domains: { match: RegExp; skills: string[]; work: string; project: string }[] = [
  { match: /nurs/, skills: ["Patient assessment", "Care planning", "Medication administration", "Clinical documentation"], work: "Coordinated care plans for a 20-bed ward, improving handover completeness by 18%.", project: "Patient handover improvement" },
  { match: /doctor|physician|surgeon|dentist/, skills: ["Clinical assessment", "Evidence-based care", "Treatment planning", "Patient counselling"], work: "Reviewed 40 patient cases weekly and introduced a structured follow-up protocol.", project: "Clinical quality review" },
  { match: /teacher|professor|educat/, skills: ["Lesson planning", "Assessment design", "Classroom management", "Learning differentiation"], work: "Designed differentiated lessons for 30 learners, improving assessment completion by 20%.", project: "Inclusive learning programme" },
  { match: /data scien|machine learn|artificial intelligence/, skills: ["Python", "SQL", "scikit-learn", "Statistical modelling", "Experiment design"], work: "Built and evaluated a prediction pipeline, improving validation precision by 12%.", project: "Predictive analytics pipeline" },
  { match: /data anal|business anal/, skills: ["SQL", "Excel", "Power BI", "Data validation", "Stakeholder reporting"], work: "Automated weekly reporting across 4 teams, saving 8 hours of manual work per week.", project: "Operational insights dashboard" },
  { match: /devops|cloud|network|security/, skills: ["Linux", "Terraform", "Docker", "CI/CD", "Monitoring"], work: "Standardised deployment checks across 6 services, reducing failed releases by 25%.", project: "Infrastructure reliability programme" },
  { match: /software|developer|web|programmer/, skills: ["TypeScript", "React", "Node.js", "SQL", "Git", "Testing"], work: "Delivered an accessible customer workflow, reducing page-load time by 30%.", project: "Customer self-service platform" },
  { match: /design|ux|ui|creative/, skills: ["Figma", "User research", "Prototyping", "Design systems", "Accessibility"], work: "Redesigned a checkout journey from 12 user interviews, improving task completion by 22%.", project: "Commerce experience redesign" },
  { match: /video|editor|content|market|writer/, skills: ["Content strategy", "Audience research", "Editorial planning", "Campaign analytics"], work: "Delivered a 6-week content campaign, increasing qualified engagement by 24%.", project: "Integrated brand campaign" },
  { match: /finance|account|bank|invest/, skills: ["Financial reporting", "Forecasting", "Excel", "Risk analysis", "Reconciliation"], work: "Streamlined month-end reconciliation, reducing close time from 8 days to 6.", project: "Financial reporting improvement" },
  { match: /law|legal|compliance/, skills: ["Legal research", "Contract review", "Regulatory analysis", "Risk assessment"], work: "Reviewed 35 commercial agreements and standardised a contract risk checklist.", project: "Contract review framework" },
  { match: /human resources|recruit|\bhr\b/, skills: ["Talent acquisition", "HR operations", "Employee relations", "Workforce planning"], work: "Improved interview coordination for 4 teams, shortening the hiring cycle by 7 days.", project: "Employee experience programme" },
  { match: /product/, skills: ["Roadmapping", "Product discovery", "SQL", "Experimentation", "Stakeholder alignment"], work: "Led discovery and delivery for a new workflow, improving activation by 18%.", project: "Product activation initiative" },
  { match: /sales|account manager|business development/, skills: ["Pipeline management", "Consultative selling", "CRM", "Negotiation", "Forecasting"], work: "Managed a 40-account pipeline and achieved 112% of the quarterly target.", project: "Strategic account growth" },
  { match: /research|scien|biotech|chemist/, skills: ["Research methods", "Experimental design", "Data analysis", "Laboratory documentation"], work: "Validated a repeatable study protocol across 120 samples, reducing rework by 15%.", project: "Applied research study" },
  { match: /engineer|architect/, skills: ["CAD", "Technical documentation", "Design validation", "Project coordination"], work: "Coordinated design reviews across 3 workstreams, reducing revision cycles by 20%.", project: "Engineering design validation" },
];
const fallback: Record<VisualLayout, { skills: string[]; work: string; project: string }> = {
  tech: { skills: ["Systems analysis", "Technical documentation", "Testing", "Problem solving"], work: "Delivered a technical improvement across 3 workstreams, reducing rework by 15%.", project: "Technical improvement initiative" },
  creative: { skills: ["Creative direction", "Visual communication", "Production planning", "Audience research"], work: "Delivered a coordinated creative programme across 3 channels.", project: "Selected creative work" },
  executive: { skills: ["Operational strategy", "Risk management", "Stakeholder engagement", "Process improvement"], work: "Standardised reporting across 4 teams, reducing turnaround time by 20%.", project: "Operational excellence programme" },
  sales: { skills: ["Customer discovery", "Relationship management", "Reporting", "Cross-functional collaboration"], work: "Introduced structured customer follow-ups, improving retention by 12%.", project: "Customer experience programme" },
  healthcare: { skills: ["Evidence-based practice", "Documentation", "Research methods", "Quality assurance"], work: "Introduced a structured quality review for a 30-person programme.", project: "Practice quality improvement" },
  student: { skills: ["Research", "Presentation", "Project coordination", "Data analysis"], work: "Coordinated a 4-person academic project and delivered all milestones on schedule.", project: "Capstone research project" },
  ats: { skills: ["Planning", "Analysis", "Communication", "Quality assurance"], work: "Improved a recurring team process, reducing manual work by 4 hours weekly.", project: "Process improvement project" },
};
export function roleExample(title: string, layout?: VisualLayout, occupationTitle = ""): ResumeDocument {
  const selected = layout ?? classifyRole({ title, occupationTitle });
  const domain = domains.find(d => d.match.test(occupationTitle || title)) ?? fallback[selected];
  const doc = applyVisualLayout(emptyDocument("visual-example"), selected, true);
  doc.presentation = { ...doc.presentation, headerAlign: "left", headingRule: true, example: true };
  doc.content = {
    personal: { name: "Alex Morgan", headline: title, email: "alex@example.com", phone: "+1 202 555 0142", location: "Your city", links: [{ label: selected === "tech" ? "GitHub" : "Portfolio", url: "https://example.com/work" }, { label: "LinkedIn", url: "https://example.com/profile" }] },
    summary: `${title} focused on ${domain.skills.slice(0, 2).join(" and ").toLowerCase()}. Combines disciplined delivery with collaborative problem-solving and clear communication.`,
    skills: [{ id: "example-skills", name: selected === "tech" ? "Tools & methods" : "Core expertise", items: domain.skills }],
    experience: [{ id: "example-experience", role: selected === "student" ? `${title} Intern` : title, company: "Example organisation", location: "Your city", start: "2023", end: "Present", bullets: [domain.work, `Collaborated with cross-functional partners to document ${domain.skills[0].toLowerCase()} practices and deliver agreed milestones.`] }],
    projects: [{ id: "example-project", name: domain.project, link: "https://example.com/project", description: `Applied ${domain.skills.slice(0, 3).join(", ")} to a scoped, end-to-end project.`, bullets: ["Documented decisions, reviewed outcomes and presented recommendations to a 4-person team."] }],
    education: [{ id: "example-education", degree: "Relevant degree / qualification", school: "Example university", location: "Your city", start: "2019", end: "2023", details: selected === "student" ? "CGPA: 8.7 / 10 · Relevant coursework and final-year project" : "Relevant coursework and professional development" }],
    certifications: [{ id: "example-cert", name: selected === "healthcare" ? "Relevant professional licence (example)" : "Relevant professional certification (example)", issuer: "Example awarding body", date: "2024" }],
    achievements: [selected === "student" ? "Led a 4-person campus project team to the final round of an academic challenge." : domain.work],
    publications: selected === "healthcare" ? [{ id: "example-publication", title: `${domain.project}: a practice review`, details: "Example journal · 2024 · Illustrative publication" }] : [],
    additional: [{ id: "example-language", kind: "language", title: "English", details: "Professional proficiency" }],
  };
  return doc;
}