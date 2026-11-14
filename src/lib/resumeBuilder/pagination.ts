export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;
export type PageMeasurement = { id: string; height: number };
// A heading is attached to its first item before measuring; no orphaned headings.
export function paginateMeasurements(items: PageMeasurement[], firstCapacity: number, nextCapacity: number): string[][] {
  if (!items.length) return [[]];
  const pages: string[][] = []; let page: string[] = [], used = 0, capacity = firstCapacity;
  for (const item of items) {
    const height = Math.max(0, item.height);
    if (page.length && used + height > capacity) { pages.push(page); page = []; used = 0; capacity = nextCapacity; }
    page.push(item.id); used += height;
  }
  if (page.length) pages.push(page);
  return pages;
}
export function splitResumeText(text: string, limit = 340): string[] {
  const words = text.trim().match(/\S+/g) ?? []; const chunks: string[] = []; let chunk = "";
  for (const word of words) {
    if (chunk && chunk.length + word.length + 1 > limit) { chunks.push(chunk); chunk = ""; }
    // Long unbroken user input remains visible and wraps rather than overflowing.
    chunk += `${chunk ? " " : ""}${word}`;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}