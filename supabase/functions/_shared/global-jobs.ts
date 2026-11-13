export type RawJob = { source: string; sourceId: string; title: string; company: string; location: string; applyUrl: string; description: string; mode?: string };

const aliases: Record<string, string> = {
  uk: "united kingdom", usa: "united states", us: "united states", uae: "united arab emirates",
  "u.s.": "united states", "u.s.a.": "united states", "u.k.": "united kingdom",
  bangalore: "bengaluru", bombay: "mumbai", gurgaon: "gurugram",
};
export function locationKey(value: string): string {
  const key = value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} .-]/gu, "");
  return aliases[key] ?? key;
}
const countryNames = new Set<string>();
const display = new Intl.DisplayNames(["en"], { type: "region" });
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
  const code = String.fromCharCode(a, b);
  const name = display.of(code);
  if (name && name !== code) countryNames.add(locationKey(name));
}
export function globalLocation(location: string, mode?: string) {
  const clean = location.replace(/\s+/g, " ").trim().slice(0, 500);
  const workMode = mode === "Remote" || /\bremote\b/i.test(clean) ? "Remote" : mode === "Hybrid" || /\bhybrid\b/i.test(clean) ? "Hybrid" : "On-site";
  const keys = [...new Set(clean.split(/[,;|•/()]+/).map(p => locationKey(p.replace(/\b(remote|hybrid|on-site)\b\s*[-:]?\s*/gi, ""))).filter(Boolean))];
  const countries = keys.filter(k => countryNames.has(k));
  const worldwide = /\b(worldwide|anywhere|global)\b/i.test(clean) && countries.length === 0;
  return { location: clean || "Location not specified", keys, countries, workMode, remoteScope: workMode !== "Remote" ? "Unknown" : worldwide ? "Worldwide" : clean ? "Restricted" : "Unknown" };
}
export function stripHtml(h: string) {
  return h.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
export function safeApplyUrl(value: string) {
  try { const u = new URL(value); return u.protocol === "https:" ? u.toString() : null; } catch { return null; }
}