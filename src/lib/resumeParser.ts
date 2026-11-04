// Client-side resume text extraction. Runs entirely in the browser.
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PDF_PAGES = 3;
export const ACCEPTED_MIME = [
  "application/pdf",
  "text/plain",
];
export const ACCEPTED_EXTS = [".pdf", ".txt"];

export const extToMime = (name: string): string | null => {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".txt")) return "text/plain";
  return null;
};

/** Throws a friendly error when a PDF is longer than MAX_PDF_PAGES. */
export async function assertPdfPageLimit(file: File): Promise<void> {
  const mime = file.type || extToMime(file.name) || "";
  if (mime !== "application/pdf") return;
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  if (pdf.numPages > MAX_PDF_PAGES)
    throw new Error(`This PDF has ${pdf.numPages} pages. Please upload a resume of ${MAX_PDF_PAGES} pages or fewer.`);
}

export async function extractResumeText(file: File): Promise<string> {
  const mime = file.type || extToMime(file.name) || "";

  if (mime === "text/plain") {
    return (await file.text()).trim();
  }

  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return (result.value || "").trim();
  }

  if (mime === "application/pdf") {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    if (pdf.numPages > MAX_PDF_PAGES)
      throw new Error(`This PDF has ${pdf.numPages} pages. Please upload a resume of ${MAX_PDF_PAGES} pages or fewer.`);
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((it) => ("str" in it ? (it as { str: string }).str : ""))
        .join(" ");
      parts.push(pageText);
    }
    return parts.join("\n\n").trim();
  }

  throw new Error("Unsupported file type. Use PDF or TXT.");
}
