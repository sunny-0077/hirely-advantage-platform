import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { ResumePreview } from "@/components/dashboard/resumeBuilder/ResumePreview";
import { A4_HEIGHT, A4_WIDTH } from "./pagination";
import { safeResumeUrl } from "./visual";
import type { ResumeDocument } from "./types";

/** Export the same paginated DOM as the canvas at 300 DPI, not a text reconstruction. */
export async function createVisualPdf(doc: ResumeDocument): Promise<jsPDF> {
  const host = document.createElement("div");
  host.style.cssText = `position:absolute;left:-10000px;top:0;width:${A4_WIDTH}px;pointer-events:none;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(createElement(ResumePreview, { doc }));
    const started = Date.now();
    await new Promise<void>((resolve, reject) => {
      const check = () => {
        if (host.querySelector('[data-resume-ready="true"]')) resolve();
        else if (Date.now() - started > 30000) reject(new Error("Resume fonts or pages could not be prepared. Please retry."));
        else setTimeout(check, 50);
      }; check();
    });
    const pages = Array.from(host.querySelectorAll<HTMLElement>("[data-resume-page]"));
    if (!pages.length) throw new Error("No resume pages available");
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    for (const [index, page] of pages.entries()) {
      if (index) pdf.addPage("a4");
      const canvas = await html2canvas(page, { scale: 300 / 96, useCORS: true, logging: false, backgroundColor: null, width: A4_WIDTH, height: A4_HEIGHT, windowWidth: 1280 });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
      const box = page.getBoundingClientRect();
      for (const anchor of Array.from(page.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
        const href = anchor.getAttribute("href") ?? "";
        const url = safeResumeUrl(href) ?? (href.startsWith("mailto:") ? href : undefined);
        if (!url) continue;
        for (const rect of Array.from(anchor.getClientRects())) pdf.link((rect.left - box.left) * 210 / A4_WIDTH, (rect.top - box.top) * 297 / A4_HEIGHT, rect.width * 210 / A4_WIDTH, rect.height * 297 / A4_HEIGHT, { url });
      }
    }
    return pdf;
  } finally { root.unmount(); host.remove(); }
}
export async function exportPdf(doc: ResumeDocument, filename = "resume.pdf") {
  const pdf = await createVisualPdf(doc); pdf.save(filename);
}