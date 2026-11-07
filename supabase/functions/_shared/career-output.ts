/** Narrow deterministic checks, not a general factuality/hallucination guarantee. */
export function assertSuppliedMetrics(output: string, resume: string): void {
  const metrics = output.match(/(?:\$|₹|€|£)\s*\d[\d,.]*(?:\s*[kmb])?|\d+(?:\.\d+)?\s*(?:%|percent\b)/gi) ?? [];
  const normalize=(s:string)=>s.toLowerCase().replace(/\s|,/g,"").replace(/percent/g,"%");
  const supplied=normalize(resume);
  for(const metric of metrics) if(!supplied.includes(normalize(metric))) throw new Error("The AI included an unsupported metric. Please try again with your saved facts.");
}
export function suppliedSkills(items: unknown, resume:string):string[] {
  if(!Array.isArray(items)) return [];
  const words=(s:string)=>s.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}+#.]+/gu," ").trim();
  const source=` ${words(resume)} `;
  return items.filter((s):s is string=>typeof s==="string" && Boolean(words(s)) && source.includes(` ${words(s)} `));
}