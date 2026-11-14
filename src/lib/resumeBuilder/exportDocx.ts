import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  LevelFormat,
} from "docx";
import { saveAs } from "file-saver";
import type { ResumeDocument } from "./types";
import { buildRenderModel, dateRange } from "./render";

const FONT_MAP: Record<string, string> = {
  Inter: "Calibri",
  Arial: "Arial",
  Times: "Times New Roman",
  Georgia: "Georgia",
};

export async function exportDocx(doc: ResumeDocument, filename = "resume.docx") {
  const font = FONT_MAP[doc.settings.fontFamily] ?? "Calibri";
  const sizeHalfPt = Math.round(doc.settings.fontSize * 2); // docx uses half-points
  const accent = doc.settings.accent.replace("#", "").toUpperCase();

  const para = (
    text: string,
    opts: { bold?: boolean; size?: number; color?: string; indent?: number; spacingAfter?: number } = {},
  ) =>
    new Paragraph({
      spacing: { after: opts.spacingAfter ?? 60, line: doc.settings.spacing === "compact" ? 250 : doc.settings.spacing === "relaxed" ? 320 : 280 },
      indent: opts.indent ? { left: opts.indent } : undefined,
      children: [
        new TextRun({
          text,
          font,
          bold: opts.bold,
          size: opts.size ?? sizeHalfPt,
          color: opts.color,
        }),
      ],
    });

  const heading = (text: string) =>
    new Paragraph({
      spacing: { before: 200, after: 80 },
      keepNext: true,
      border: doc.presentation?.headingRule === false ? undefined : {
        bottom: { color: accent, space: 1, style: BorderStyle.SINGLE, size: 6 },
      },
      children: [
        new TextRun({
          text: text.toUpperCase(),
          font,
          bold: true,
          size: sizeHalfPt + 2,
          color: accent,
        }),
      ],
    });

  const bullet = (text: string) =>
    new Paragraph({
      numbering: { reference: "bullets", level: 0 },
      spacing: { after: 40, line: 280 },
      children: [new TextRun({ text, font, size: sizeHalfPt })],
    });

  const children: Paragraph[] = [];

  const p = doc.content.personal;
  if (p.name) {
    children.push(
      new Paragraph({
        alignment: doc.presentation?.headerAlign === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 60 },
        children: [
          new TextRun({ text: p.name, font, bold: true, size: sizeHalfPt + 12, color: accent }),
        ],
      }),
    );
  }
  if (p.headline) children.push(para(p.headline, { color: "404040", spacingAfter: 40 }));
  const contact = [p.email, p.phone, p.location, ...p.links.map((l) => l.url)].filter(Boolean);
  if (contact.length)
    children.push(para(contact.join("  |  "), { color: "555555", size: sizeHalfPt - 2, spacingAfter: 160 }));

  for (const sec of buildRenderModel(doc)) {
    children.push(heading(sec.name));
    switch (sec.type) {
      case "summary":
        children.push(para(sec.text));
        break;
      case "skills":
        for (const g of sec.groups) {
          if (sec.groups.length > 1) {
            children.push(
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: `${g.name}: `, font, bold: true, size: sizeHalfPt }),
                  new TextRun({ text: g.items.join(", "), font, size: sizeHalfPt }),
                ],
              }),
            );
          } else {
            children.push(para(g.items.join(", ")));
          }
        }
        break;
      case "experience":
        for (const it of sec.items) {
          children.push(para(`${it.role}${it.company ? ", " + it.company : ""}`, { bold: true }));
          const meta = [it.location, dateRange(it.start, it.end),it.employmentType].filter(Boolean).join("  |  ");
          if (meta) children.push(para(meta, { color: "555555", size: sizeHalfPt - 2 }));
          for (const b of it.bullets.filter(Boolean)) children.push(bullet(b));
        }
        break;
      case "projects":
        for (const it of sec.items) {
          children.push(para(`${it.name}${it.link ? "  —  " + it.link : ""}`, { bold: true }));
          if (it.description) children.push(para(it.description));
          for (const b of it.bullets.filter(Boolean)) children.push(bullet(b));
        }
        break;
      case "education":
        for (const it of sec.items) {
          children.push(para(`${it.degree}${it.school ? ", " + it.school : ""}`, { bold: true }));
          const meta = [it.location, dateRange(it.start, it.end)].filter(Boolean).join("  |  ");
          if (meta) children.push(para(meta, { color: "555555", size: sizeHalfPt - 2 }));
          if (it.details) children.push(para(it.details));
        }
        break;
      case "certifications":
        for (const it of sec.items) {
          const right = [it.issuer, it.date, it.expiry ? `Expires ${it.expiry}` : "", it.url].filter(Boolean).join(" · ");
          children.push(para(`${it.name}${right ? "  —  " + right : ""}`));
        }
        break;
      case "achievements":
        for (const a of sec.items) children.push(bullet(a));
        break;
      case "publications":
      case "additional":
      case "languages":
        for(const it of sec.items) { if(it.title) children.push(para(it.title,{bold:true})); if(it.details) children.push(para(it.details)); }
        break;
      case "portfolio":
        for (const it of sec.items) children.push(para(`${it.label}: ${it.url}`));
        break;
    }
  }

  const wordDocument = new Document({
    styles: {
      default: { document: { run: { font, size: sizeHalfPt } } },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 220 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(wordDocument);
  saveAs(blob, filename);
}
