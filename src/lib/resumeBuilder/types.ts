// Shared factual model for visual and ATS resume presentations.

export type VisualLayout = "tech" | "creative" | "executive" | "sales" | "healthcare" | "student" | "ats";
export type ResumePalette = "navy" | "slate" | "emerald" | "terracotta" | "violet" | "mono" | "crimson" | "teal";
export type FontPairing = "modern" | "classic" | "tech" | "editorial";

export type SectionType =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "certifications"
  | "achievements"
  | "publications"
  | "additional"
  | "languages"
  | "portfolio";

export type Section = {
  id: string;
  type: SectionType;
  /** Display name — must be one of ATS-safe approved names for this type. */
  name: string;
  enabled: boolean;
};

export type Personal = {
  name: string;
  headline: string;          // e.g. "Senior Data Analyst"
  email: string;
  phone: string;
  location: string;
  links: { label: string; url: string }[];
};

export type SkillGroup = { id: string; name: string; items: string[] };

export type ExperienceItem = {
  id: string;
  company: string;
  role: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
  employmentType?: string;
};

export type ProjectItem = {
  id: string;
  name: string;
  link: string;
  description: string;
  bullets: string[];
};

export type EducationItem = {
  id: string;
  school: string;
  degree: string;
  location: string;
  start: string;
  end: string;
  details: string;
};

export type CertificationItem = {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiry?: string;
  url?: string;
};

export type ResumeContent = {
  personal: Personal;
  summary: string;
  skills: SkillGroup[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  education: EducationItem[];
  certifications: CertificationItem[];
  achievements: string[];
  publications?: { id: string; title: string; details: string }[];
  additional?: { id: string; kind: string; title: string; details: string }[];
};

export type ResumeSettings = {
  fontFamily: "Inter" | "Arial" | "Georgia" | "Times";
  fontSize: 10 | 10.5 | 11 | 11.5 | 12;
  spacing: "compact" | "normal" | "relaxed";
  /** Hex string. Black or near-black recommended for max ATS safety. */
  accent: string;
};

export type ResumeDocument = {
  templateId: string;
  sections: Section[];
  content: ResumeContent;
  settings: ResumeSettings;
  presentation?: {
    headerAlign: "left" | "center";
    headingRule: boolean;
    layout?: VisualLayout;
    palette?: ResumePalette;
    fontPairing?: FontPairing;
    example?: boolean;
  };
  sourceSnapshot?: unknown;
};

export type AtsTemplateMeta = {
  id: string;
  name: string;
  description: string;
  atsSafe: true;
};

/** Approved, ATS-safe alternative names a user may pick when renaming. */
export const APPROVED_SECTION_NAMES: Record<SectionType, string[]> = {
  summary: ["Professional Summary", "Summary", "Profile", "About"],
  skills: ["Skills", "Technical Skills", "Core Competencies", "Key Skills"],
  experience: [
    "Experience",
    "Work Experience",
    "Professional Experience",
    "Employment History",
  ],
  projects: ["Projects", "Selected Projects", "Personal Projects", "Key Projects"],
  education: ["Education", "Academic Background", "Education & Training"],
  certifications: ["Certifications", "Licenses & Certifications", "Credentials"],
  achievements: ["Achievements", "Awards", "Honors & Awards", "Recognition"],
  publications: ["Publications", "Research Publications"],
  additional: ["Additional Information", "Languages & Volunteering"],
  languages: ["Languages"],
  portfolio: ["Portfolio", "Selected Work", "Portfolio & Links"],
};

export const DEFAULT_SECTION_NAME: Record<SectionType, string> = {
  summary: "Professional Summary",
  skills: "Skills",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  certifications: "Certifications",
  achievements: "Achievements",
  publications: "Publications",
  additional: "Additional Information",
  languages: "Languages",
  portfolio: "Portfolio",
};
