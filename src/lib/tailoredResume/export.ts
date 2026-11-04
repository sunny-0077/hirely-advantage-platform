import { jsPDF } from "jspdf";

export function safeFileName(name: string) {
  return (name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "tailored-resume") + "-resume";
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Clean text: strip markdown markers, normalize bullets and spacing. */
export function cleanResumeText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\*\*|__|`/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[*\-•]\s+/gm, "• ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const isHeading = (l: string) =>
  l.length > 2 && l.length < 40 && !l.startsWith("•") && /^[A-Z0-9 &/,\-()]+:?$/.test(l) && /[A-Z]/.test(l);

export function exportTailoredTxt(name: string, text: string) {
  save(new Blob([cleanResumeText(text) + "\n"], { type: "text/plain;charset=utf-8" }), `${safeFileName(name)}.txt`);
}

export function exportTailoredPdf(name: string, text: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 54, W = doc.internal.pageSize.getWidth() - M * 2, H = doc.internal.pageSize.getHeight();
  let y = M;
  const need = (h: number) => { if (y + h > H - M) { doc.addPage(); y = M; } };
  const lines = cleanResumeText(text).split("\n");
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { y += 6; return; }
    if (i === 0) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(18);
      for (const w of doc.splitTextToSize(line, W)) { need(22); doc.text(w, M, y + 14); y += 22; }
      y += 4; return;
    }
    if (isHeading(line)) {
      y += 8; need(24);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
      doc.text(line.replace(/:$/, "").toUpperCase(), M, y + 11);
      doc.setLineWidth(0.6); doc.line(M, y + 15, M + W, y + 15);
      y += 22; return;
    }
    doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
    const bullet = line.startsWith("• ");
    const body = bullet ? line.slice(2) : line;
    const indent = bullet ? 12 : 0;
    doc.splitTextToSize(body, W - indent).forEach((w: string, j: number) => {
      need(14);
      if (bullet && j === 0) doc.text("•", M, y + 10);
      doc.text(w, M + indent, y + 10); y += 14;
    });
  });
  save(doc.output("blob"), `${safeFileName(name)}.pdf`);
}
