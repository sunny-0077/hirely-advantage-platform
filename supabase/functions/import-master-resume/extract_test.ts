import { extractImport, MAX_IMPORT_BYTES } from "./extract.ts";
import { importHandler } from "./handler.ts";
import { zipSync, strToU8 } from "npm:fflate@0.8.2";
const fixture = (name: string) => Deno.readFile(new URL(`./fixtures/${name}`, import.meta.url));
function assert(value: unknown, message = "Assertion failed"): asserts value { if (!value) throw new Error(message); }
async function rejects(bytes: Uint8Array, name: string, pattern: RegExp) {
  try { await extractImport(bytes, name); } catch (e) { assert(e instanceof Error && pattern.test(e.message), String(e)); return; }
  throw new Error("Expected document rejection");
}
Deno.test("valid real PDF extraction preserves lines and supplied facts", async () => {
  const result = await extractImport(await fixture("resume.pdf"), "resume.pdf");
  assert(result.text.includes("Technical: SQL, Python")); assert(result.text.includes("Responsibilities:\n")); assert(result.pages === 1);
});
Deno.test("valid real DOCX extraction", async () => {
  const result = await extractImport(await fixture("resume.docx"), "resume.docx");
  assert(result.text.includes("Job title: Analyst")); assert(result.text.includes("Published a dashboard"));
});
Deno.test("unsupported filenames and renamed executable content rejected", async () => {
  await rejects(new Uint8Array([77, 90, 1]), "resume.exe", /Only PDF/);
  await rejects(new Uint8Array([77, 90, 1]), "resume.pdf", /not a valid PDF/);
  await rejects(new Uint8Array([77, 90, 1]), "resume.docx", /not a valid DOCX/);
});
Deno.test("5MB byte limit enforced", async () => { await rejects(new Uint8Array(MAX_IMPORT_BYTES + 1), "resume.pdf", /5 MB/); });
Deno.test("empty file and empty Word document rejected", async () => {
  await rejects(new Uint8Array(), "resume.pdf", /empty/);
  await rejects(await fixture("empty.docx"), "resume.docx", /no readable text/);
});
Deno.test("corrupt PDF and DOCX rejected", async () => {
  await rejects(strToU8("%PDF-1.7 broken"), "resume.pdf", /corrupted/);
  await rejects(new Uint8Array([80, 75, 3, 4]), "resume.docx", /corrupted|unreadable/);
});
Deno.test("scanned PDF has no fabricated OCR output", async () => { await rejects(await fixture("scanned.pdf"), "resume.pdf", /no extractable text.*scanned/); });
Deno.test("existing three-page PDF limit preserved", async () => { await rejects(await fixture("four-pages.pdf"), "resume.pdf", /3 pages/); });
Deno.test("arbitrary ZIP and macro document rejected", async () => {
  await rejects(zipSync({ "readme.txt": strToU8("not a resume") }), "resume.docx", /real DOCX/);
  await rejects(zipSync({ "word/document.xml": strToU8("<w:document/>"), "[Content_Types].xml": strToU8("macroEnabled"), "word/vbaProject.bin": new Uint8Array([1]) }), "resume.docx", /unsafe/);
});
Deno.test("server rejects unsigned and invalid sessions before reading document", async () => {
  let authCalls = 0;
  const handler = importHandler(() => ({ auth: { getUser: async () => { authCalls++; return { data: { user: null }, error: null }; } } }));
  const unsigned = await handler(new Request("https://local", { method: "POST" })); assert(unsigned.status === 401); await unsigned.text(); assert(authCalls === 0);
  const invalid = await handler(new Request("https://local", { method: "POST", headers: { Authorization: "Bearer invalid" } })); assert(invalid.status === 401); await invalid.text(); assert(Number(authCalls) === 1);
});
Deno.test("authenticated extraction has no cross-user data, profile writes or credit calls", async () => {
  for (const id of ["owner-a", "owner-b"]) {
    const handler = importHandler(() => ({ auth: { getUser: async () => ({ data: { user: { id } }, error: null }) } }));
    const response = await handler(new Request("https://local", { method: "POST", headers: { Authorization: "Bearer valid", "x-resume-filename": "resume.docx", "x-user-id": "other-user" }, body: await fixture("resume.docx") }));
    assert(response.status === 200); const body = await response.json(); assert(body.text.includes("SQL")); assert(!JSON.stringify(body).includes(id));
  }
});