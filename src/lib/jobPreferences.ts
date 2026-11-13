import { locationKey } from "../../supabase/functions/_shared/global-jobs";
export const REMOTE_WORLDWIDE = "Remote / Worldwide";
export const WORK_MODES = ["On-site", "Hybrid", "Remote"] as const;
export const MAX_LOCATIONS = 3;
export const TEMPLATE_IDS = { minimal: "software-engineer", modern: "modern-ats", classic: "classic-ats" } as const;
export type TemplateStyle = keyof typeof TEMPLATE_IDS;
export const EXPERIENCE_LEVELS = [
  { value: "student", label: "Student" }, { value: "entry", label: "Fresher (0-1 yrs)" },
  { value: "mid", label: "Mid-Level (2-5 yrs)" }, { value: "senior", label: "Senior (5+ yrs)" },
] as const;
export const POPULAR_ROLES = ["Full-Stack Developer", "Software Engineer", "Frontend Developer", "Backend Developer", "Product Designer", "UX Designer", "Data Analyst", "Data Scientist", "Machine Learning Engineer", "Product Manager", "Marketing Specialist", "Business Analyst", "DevOps Engineer", "Sales Executive", "Customer Success Manager", "Financial Analyst", "HR Specialist", "Content Writer"];

/** Hubs suggested from the browser's time zone; always globally searchable beyond these. */
export function suggestedHubs(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""): string[] {
  const region: Record<string, string[]> = {
    "Asia/Kolkata": ["Bengaluru, India", "Hyderabad, India", "Pune, India", "Mumbai, India"],
    "Asia/Calcutta": ["Bengaluru, India", "Hyderabad, India", "Pune, India", "Mumbai, India"],
    "Europe/London": ["London, UK", "Manchester, UK", "Dublin, Ireland", "Amsterdam, Netherlands"],
    "America/New_York": ["New York, USA", "Boston, USA", "Toronto, Canada", "Austin, USA"],
    "America/Los_Angeles": ["San Francisco, USA", "Seattle, USA", "Los Angeles, USA", "Vancouver, Canada"],
    "America/Toronto": ["Toronto, Canada", "Montreal, Canada", "Vancouver, Canada", "New York, USA"],
    "Asia/Dubai": ["Dubai, UAE", "Abu Dhabi, UAE", "Riyadh, Saudi Arabia", "Doha, Qatar"],
    "Asia/Singapore": ["Singapore", "Kuala Lumpur, Malaysia", "Jakarta, Indonesia", "Sydney, Australia"],
    "Australia/Sydney": ["Sydney, Australia", "Melbourne, Australia", "Auckland, New Zealand", "Singapore"],
    "Europe/Berlin": ["Berlin, Germany", "Munich, Germany", "Amsterdam, Netherlands", "Paris, France"],
  };
  return region[timeZone] ?? ["London, UK", "Toronto, Canada", "Dubai, UAE", "Singapore"];
}

export function addLocation(list: string[], value: string): string[] {
  const clean = value.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!clean || list.some(l => l.toLowerCase() === clean.toLowerCase())) return list;
  const real = list.filter(l => l !== REMOTE_WORLDWIDE);
  if (clean !== REMOTE_WORLDWIDE && real.length >= MAX_LOCATIONS) return list;
  return [...list, clean];
}

/** City/country search terms used against the job feed's location field. */
export function locationTerms(locations: string[]): string[] {
  const terms = new Set<string>();
  for (const loc of locations) {
    if (loc === REMOTE_WORLDWIDE) continue;
    const city = loc.split(",")[0].trim().toLowerCase();
    if (city) terms.add(locationKey(city));
  }
  return [...terms].map(t => t.replace(/[^\p{L}\p{N} .-]/gu, "")).filter(Boolean);
}

/** PostgREST OR filter for preferred places; remote preference matches remote openings anywhere. */
export function jobLocationFilter(locations: string[], modes: string[]): string | null {
  const parts = locations.filter(l => l !== REMOTE_WORLDWIDE).map(l => {
    const [city, ...rest] = l.split(",").map(locationKey);
    if (!city) return "";
    const country = rest.at(-1);
    const cityMatch = `location_keys.cs.{${city}}`;
    return country ? `and(${cityMatch},or(country_keys.cs.{${country}},country_keys.eq.{}))` : cityMatch;
  }).filter(Boolean);
  if (locations.includes(REMOTE_WORLDWIDE)) parts.push("and(work_mode.eq.Remote,remote_scope.eq.Worldwide)");
  void modes; // Modes narrow the result separately; Remote never overrides a selected place.
  return parts.length ? parts.join(",") : null;
}

export function jobRoleFilter(role: string): string | null {
  const tokens = role.toLowerCase().split(/[^a-z0-9+#]+/).filter(w => w.length > 2 && !["senior", "junior", "lead", "staff", "principal"].includes(w));
  return tokens.length ? tokens.slice(0, 8).map(w => `title.ilike.*${w}*`).join(",") : null;
}

export function roleScore(title: string, role: string): number {
  const words = role.toLowerCase().split(/[^a-z0-9+#]+/).filter(w => w.length > 2);
  const t = title.toLowerCase();
  return words.filter(w => t.includes(w)).length;
}
export function rankByRole<T extends { title: string }>(jobs: T[], role: string): T[] {
  if (!role.trim()) return jobs;
  return jobs.map((j, i) => ({ j, i, s: roleScore(j.title, role) })).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.j);
}

export function postOnboardingPath(p: { resume_mode: string | null; preferred_template: string | null; target_job_role: string | null }): string {
  if (p.resume_mode === "upload") return "/app/resume";
  const template = TEMPLATE_IDS[(p.preferred_template ?? "classic") as TemplateStyle] ?? TEMPLATE_IDS.classic;
  const q = new URLSearchParams({ template });
  if (p.target_job_role) q.set("role", p.target_job_role);
  return `/app/resume-builder?${q}`;
}
