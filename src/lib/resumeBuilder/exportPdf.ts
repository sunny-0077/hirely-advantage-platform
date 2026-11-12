import jsPDF from "jspdf";
import type { ResumeDocument } from "./types";
import { buildRenderModel, dateRange } from "./render";
import { documentFonts, fontBase64 } from "./fonts";

const FONT_MAP: Record<string, string> = {
  Inter: "helvetica",
  Arial: "helvetica",
  Times: "times",
  Georgia: "times",
};

export async function exportPdf(doc: ResumeDocument, filename = "resume.pdf") {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const serif=doc.settings.fontFamily==="Times"||doc.settings.fontFamily==="Georgia";
  const [regular,bold]=await Promise.all([fontBase64(serif?documentFonts.serif.url:documentFonts.sans.url),fontBase64(serif?documentFonts.serifBold.url:documentFonts.sansBold.url)]);
  pdf.addFileToVFS("HirelyRegular.ttf",regular);pdf.addFont("HirelyRegular.ttf","HirelyDocument","normal");
  pdf.addFileToVFS("HirelyBold.ttf",bold);pdf.addFont("HirelyBold.ttf","HirelyDocument","bold");
  const font = "HirelyDocument";
  const baseSize = doc.settings.fontSize;
  const lineGap =
    doc.settings.spacing === "compact" ? 1.18 : doc.settings.spacing === "relaxed" ? 1.5 : 1.32;

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 54; // 0.75"
  const maxW = pageW - margin * 2;

  let y = margin;
  const accent = hexToRgb(doc.settings.accent);

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const text = (
    s: string,
    opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number } = {},
  ) => {
    const size = opts.size ?? baseSize;
    pdf.setFont(font, opts.bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...(opts.color ?? [20, 20, 20]));
    const lines = pdf.splitTextToSize(s, maxW - (opts.indent ?? 0));
    for (const line of lines) {
      ensureSpace(size * lineGap);
      pdf.text(line, margin + (opts.indent ?? 0), y + size);
      y += size * lineGap;
    }
  };

  const heading = (s: string) => {
    y += baseSize * 0.4;
    ensureSpace(baseSize * 4);
    pdf.setFont(font, "bold");
    pdf.setFontSize(baseSize + 1);
    pdf.setTextColor(...accent);
    pdf.text(s.toUpperCase(), margin, y + baseSize);
    y += baseSize * 1.05;
    pdf.setDrawColor(...accent);
    pdf.setLineWidth(0.6);
    if (doc.presentation?.headingRule !== false) pdf.line(margin, y, pageW - margin, y);
    y += baseSize * 0.55;
    pdf.setTextColor(20, 20, 20);
  };

  const bullet = (s: string) => {
    pdf.setFont(font, "normal");
    pdf.setFontSize(baseSize);
    pdf.setTextColor(20, 20, 20);
    const indent = 12;
    const lines = pdf.splitTextToSize(s, maxW - indent);
    lines.forEach((line: string, i: number) => {
      ensureSpace(baseSize * lineGap);
      if (i === 0) pdf.text("•", margin, y + baseSize);
      pdf.text(line, margin + indent, y + baseSize);
      y += baseSize * lineGap;
    });
  };

  // Header
  const p = doc.content.personal;
  if (p.name) {
    pdf.setFont(font, "bold");
    pdf.setFontSize(baseSize + 8);
    pdf.setTextColor(...accent);
    const nameLines = pdf.splitTextToSize(p.name,maxW);
    for (const nameLine of nameLines) { ensureSpace(baseSize+14); pdf.text(nameLine,doc.presentation?.headerAlign === "center" ? pageW/2 : margin,y+baseSize+8,{align:doc.presentation?.headerAlign === "center" ? "center":"left"}); y+=baseSize+14; }
  }
  if (p.headline) {
    text(p.headline, { size: baseSize + 1, color: [60, 60, 60] });
  }
  const contactParts = [p.email, p.phone, p.location, ...p.links.map((l) => l.url)].filter(Boolean);
  if (contactParts.length) {
    text(contactParts.join("  |  "), { size: baseSize - 1, color: [80, 80, 80] });
  }
  y += 6;

  for (const sec of buildRenderModel(doc)) {
    heading(sec.name);
    switch (sec.type) {
      case "summary":
        text(sec.text);
        break;
      case "skills":
        for (const g of sec.groups) {
          if (sec.groups.length > 1) {
            pdf.setFont(font, "bold");
            pdf.setFontSize(baseSize);
            ensureSpace(baseSize * lineGap);
            pdf.text(`${g.name}: `, margin, y + baseSize);
            const labelW = pdf.getTextWidth(`${g.name}: `);
            pdf.setFont(font, "normal");
            const items = g.items.join(", ");
            const lines = pdf.splitTextToSize(items, maxW - labelW);
            lines.forEach((line: string, i: number) => {
              if (i === 0) pdf.text(line, margin + labelW, y + baseSize);
              else {
                y += baseSize * lineGap;
                ensureSpace(baseSize * lineGap);
                pdf.text(line, margin, y + baseSize);
              }
            });
            y += baseSize * lineGap;
          } else {
            text(g.items.join(", "));
          }
        }
        break;
      case "experience":
        for (const it of sec.items) {
          text(`${it.role}${it.company ? ", " + it.company : ""}`, { bold: true });
          const meta = [it.location, dateRange(it.start, it.end),it.employmentType].filter(Boolean).join("  |  ");
          if (meta) text(meta, { size: baseSize - 1, color: [80, 80, 80] });
          for (const b of it.bullets.filter(Boolean)) bullet(b);
          y += 4;
        }
        break;
      case "projects":
        for (const it of sec.items) {
          text(`${it.name}${it.link ? "  —  " + it.link : ""}`, { bold: true });
          if (it.description) text(it.description);
          for (const b of it.bullets.filter(Boolean)) bullet(b);
          y += 4;
        }
        break;
      case "education":
        for (const it of sec.items) {
          text(`${it.degree}${it.school ? ", " + it.school : ""}`, { bold: true });
          const meta = [it.location, dateRange(it.start, it.end)].filter(Boolean).join("  |  ");
          if (meta) text(meta, { size: baseSize - 1, color: [80, 80, 80] });
          if (it.details) text(it.details);
          y += 4;
        }
        break;
      case "certifications":
        for (const it of sec.items) {
          const right = [it.issuer, it.date, it.expiry ? `Expires ${it.expiry}` : "", it.url].filter(Boolean).join(" · ");
          text(`${it.name}${right ? "  —  " + right : ""}`);
        }
        break;
      case "achievements":
        for (const a of sec.items) bullet(a);
        break;
      case "publications":
      case "additional":
        for (const it of sec.items) { if(it.title) text(it.title,{bold:true}); if(it.details) text(it.details); }
        break;
    }
  }

  pdf.save(filename);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
