import { extractText, getDocumentProxy } from "npm:unpdf@2.1.0";
import mammoth from "npm:mammoth@1.12.0";
import { unzipSync } from "npm:fflate@0.8.2";
import { Buffer } from "node:buffer";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_PAGES = 3;
const MAX_TEXT = 50000;
const MAX_EXPANDED = 20 * 1024 * 1024;
export class ImportError extends Error {}

/** Inspect the ZIP directory before decompressing: bound expansion and reject macros. */
function validateDocx(bytes: Uint8Array) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50 && i + 22 + v.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  }
  if (end < 0 || v.getUint16(end + 4, true) || v.getUint16(end + 6, true)) throw new ImportError("This Word document is corrupted or unsupported.");
  const entries = v.getUint16(end + 10, true);
  let pos = v.getUint32(end + 16, true), expanded = 0;
  const names = new Set<string>();
  if (!entries || entries > 300 || pos + v.getUint32(end + 12, true) > end) throw new ImportError("This Word document is too complex or unreadable.");
  for (let i = 0; i < entries; i++) {
    if (pos + 46 > end || v.getUint32(pos, true) !== 0x02014b50) throw new ImportError("This Word document is corrupted.");
    const len = v.getUint16(pos + 28, true), extra = v.getUint16(pos + 30, true), comment = v.getUint16(pos + 32, true);
    if (pos + 46 + len + extra + comment > end) throw new ImportError("This Word document is corrupted.");
    const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + len));
    expanded += v.getUint32(pos + 24, true);
    if (expanded > MAX_EXPANDED || names.has(name) || /(^\/|\.\.|\\|vbaProject|\.exe$|\.bin$)/i.test(name) || v.getUint16(pos + 8, true) & 1 || ![0, 8].includes(v.getUint16(pos + 10, true))) throw new ImportError("This Word document contains unsupported or unsafe content.");
    names.add(name); pos += 46 + len + extra + comment;
  }
  if (!names.has("word/document.xml") || !names.has("[Content_Types].xml")) throw new ImportError("Select a real DOCX resume, not another ZIP or document format.");
  const parts = unzipSync(bytes, { filter: entry => ["word/document.xml", "[Content_Types].xml"].includes(entry.name) });
  const xml = new TextDecoder().decode(parts["word/document.xml"]);
  const types = new TextDecoder().decode(parts["[Content_Types].xml"]);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml + types) || !/<(?:\w+:)?document\b/.test(xml) || !types.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml") || /macroEnabled/i.test(types)) throw new ImportError("This is not a supported, readable DOCX document.");
}

export async function extractImport(bytes: Uint8Array, filename: string) {
  if (!bytes.length) throw new ImportError("This file is empty. Select a resume with readable text.");
  if (bytes.length > MAX_IMPORT_BYTES) throw new ImportError("Choose a resume of 5 MB or less.");
  const ext = filename.toLowerCase().split(".").pop();
  if (ext !== "pdf" && ext !== "docx") throw new ImportError("Only PDF and DOCX resumes are supported.");
  let text = "", pages: number | undefined;
  try {
    if (ext === "pdf") {
      if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") throw new ImportError("This file is not a valid PDF document.");
      const pdf = await getDocumentProxy(bytes, { isEvalSupported: false, useSystemFonts: false });
      try {
        pages = pdf.numPages;
        if (pages > MAX_IMPORT_PAGES) throw new ImportError("Choose a PDF resume with 3 pages or fewer.");
        const result = await extractText(pdf, { mergePages: true });
        text = result.text;
      } finally { await pdf.destroy(); }
    } else {
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4) throw new ImportError("This file is not a valid DOCX document.");
      validateDocx(bytes);
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      text = result.value;
    }
  } catch (e) {
    if (e instanceof ImportError) throw e;
    throw new ImportError("This document is corrupted, encrypted, or unreadable. Try another file or enter your details manually.");
  }
  text = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\ufeff]/g, "").trim();
  if (!/[\p{L}\p{N}]/u.test(text)) throw new ImportError(ext === "pdf" ? "This PDF has no extractable text. It may be scanned. Use a text-based PDF or DOCX, or enter your details manually; OCR is not available." : "This Word document contains no readable text. Enter your details manually or select another file.");
  if (text.length > MAX_TEXT) throw new ImportError("This document contains too much text. Use a shorter resume (up to 50,000 characters).");
  return { text, format: ext, pages };
}