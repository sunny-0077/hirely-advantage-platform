import { stripHtml, type RawJob } from "../_shared/global-jobs.ts";

export const GREENHOUSE = ["razorpaysoftwareprivatelimited", "groww", "databricks", "mongodb", "gitlab", "stripe", "figma", "airbnb"];
export const LEVER = ["cred", "meesho", "zeta", "paytm", "spotify"];
async function read(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`Feed HTTP ${r.status}`);
  return r.json();
}
export async function fetchGreenhouse(token: string): Promise<RawJob[]> {
  const d = await read(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`);
  return (d.jobs ?? []).map((j: any) => ({ source: "Greenhouse", sourceId: `${token}:${j.id}`, title: j.title ?? "", company: j.company_name ?? token,
    location: j.location?.name ?? "", applyUrl: j.absolute_url ?? "", description: "" }));
}
export async function hydrateJob(job: RawJob): Promise<RawJob> {
  if (job.source !== "Greenhouse") return job;
  const [board, id] = job.sourceId.split(":");
  const d = await read(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs/${encodeURIComponent(id)}`);
  return { ...job, description: stripHtml((d.content ?? "").slice(0, 100000)) };
}
export async function fetchLever(company: string): Promise<RawJob[]> {
  const d = await read(`https://api.lever.co/v0/postings/${company}?mode=json`);
  if (!Array.isArray(d)) throw new Error("Invalid Lever response");
  return d.map((j: any) => ({ source: "Lever", sourceId: `${company}:${j.id}`, title: j.text ?? "", company: company.charAt(0).toUpperCase() + company.slice(1),
    location: [...new Set([j.categories?.location, ...(j.categories?.allLocations ?? [])].filter(Boolean))].join("; "),
    mode: j.workplaceType === "remote" ? "Remote" : j.workplaceType === "hybrid" ? "Hybrid" : undefined,
    applyUrl: j.applyUrl ?? j.hostedUrl ?? "", description: stripHtml((j.descriptionPlain ?? j.description ?? "").slice(0, 100000)) }));
}
export async function fetchArbeitnow(uk = false): Promise<RawJob[]> {
  const domain = uk ? "www.arbeitnow.co.uk" : "www.arbeitnow.com";
  const jobs: RawJob[] = [];
  // Bounded pagination; scheduled refreshes do not fan out per user.
  for (let page = 1; page <= 2; page++) {
    const d = await read(`https://${domain}/api/job-board-api?page=${page}`);
    if (!Array.isArray(d.data)) throw new Error("Invalid Arbeitnow response");
    jobs.push(...d.data.map((j: any) => ({ source: "Arbeitnow", sourceId: `${domain}:${j.slug}`, title: j.title ?? "", company: j.company_name ?? "",
      location: [j.location, uk ? "United Kingdom" : "Germany"].filter(Boolean).join(", "), mode: j.remote ? "Remote" : undefined,
      applyUrl: j.url ?? "", description: stripHtml((j.description ?? "").slice(0, 100000)) })));
    if (!d.links?.next) break;
  }
  return jobs;
}