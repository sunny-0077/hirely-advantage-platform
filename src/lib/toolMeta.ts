import {
  FileText,
  FilePlus2,
  GitCompare,
  Target,
  ScanSearch,
  ScanLine,
  Mail,
  Mic,
  type LucideIcon,
} from "lucide-react";
import type { ToolColor } from "@/components/dashboard/ToolIcon";

export interface ToolMeta {
  label: string;
  icon: LucideIcon;
  color: ToolColor;
}

export const TOOL_META: Record<string, ToolMeta> = {
  "/app/resume":         { label: "Resume Analyzer",       icon: FileText,   color: "blue"   },
  "/app/resume-builder": { label: "Resume Builder",        icon: FilePlus2,  color: "blue"   },
  "/app/compare":        { label: "Compare Resumes",       icon: GitCompare, color: "lilac"  },
  "/app/ats-optimizer":  { label: "ATS Keyword Optimizer", icon: Target,     color: "orange" },
  "/app/gap-analysis":   { label: "Job Gap Analysis",      icon: ScanSearch, color: "orange" },
  "/app/ats-parse-sim":  { label: "ATS Parse Simulator",   icon: ScanLine,   color: "orange" },
  "/app/cover-letter":   { label: "Cover Letter Generator",icon: Mail,       color: "lilac"  },
  "/app/interview-prep": { label: "Interview Prep",        icon: Mic,        color: "blush"  },
};

export function getToolMeta(pathname: string): ToolMeta | undefined {
  return TOOL_META[pathname];
}

export const SUITE_ROUTES: string[] = [
  "/app/resume",
  "/app/resume-builder",
  "/app/compare",
  "/app/ats-optimizer",
  "/app/gap-analysis",
  "/app/ats-parse-sim",
  "/app/cover-letter",
  "/app/interview-prep",
];
