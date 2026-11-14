import asset from "@/assets/resume-occupation-examples.json.asset.json";

export type OccupationExample = { title: string; tasks: string[]; skills: string[] };
let catalogue: Promise<Record<string, OccupationExample>> | undefined;

export async function loadOccupationExample(id: string): Promise<OccupationExample | undefined> {
  catalogue ??= fetch(asset.url).then(async response => {
    if (!response.ok) throw new Error("Occupation examples unavailable");
    return await response.json() as Record<string, OccupationExample>;
  }).catch(error => { catalogue = undefined; throw error; });
  return (await catalogue)[id];
}