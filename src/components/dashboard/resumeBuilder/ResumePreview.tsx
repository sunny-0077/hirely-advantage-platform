import type { ResumeDocument } from "@/lib/resumeBuilder/types";
import { buildRenderModel, dateRange } from "@/lib/resumeBuilder/render";

/**
 * Live preview of an ATS-safe resume.
 * Renders to plain HTML — single column, no icons, no graphics.
 * The PDF/DOCX exporters render the same model independently.
 */
export function ResumePreview({ doc }: { doc: ResumeDocument }) {
  const { settings } = doc;
  const fontFamily =
    settings.fontFamily === "Inter"
      ? "Inter, system-ui, sans-serif"
      : settings.fontFamily === "Arial"
        ? "Arial, Helvetica, sans-serif"
        : settings.fontFamily === "Georgia"
          ? "Georgia, serif"
          : "'Times New Roman', Times, serif";

  const lineHeight =
    settings.spacing === "compact" ? 1.28 : settings.spacing === "relaxed" ? 1.55 : 1.4;
  const sectionGap = settings.spacing === "compact" ? 10 : settings.spacing === "relaxed" ? 18 : 14;

  const accent = settings.accent;
  const p = doc.content.personal;
  const contact = [p.email, p.phone, p.location, ...p.links.map((l) => l.url)].filter(Boolean);

  return (
    <div
      className="resume-preview bg-background text-foreground shadow-subtle mx-auto break-words"
      style={{
        width: "8.5in",
        minHeight: "11in",
        padding: "0.75in",
        fontFamily,
        fontSize: `${settings.fontSize}pt`,
        lineHeight,
      }}
    >
      {/* Header */}
      <div style={{textAlign: doc.presentation?.headerAlign ?? "left"}}>
      {p.name ? (
        <div style={{ color: accent, fontWeight: 700, fontSize: `${settings.fontSize + 8}pt` }}>
          {p.name}
        </div>
      ) : (
        <div style={{ color: "#bbb", fontWeight: 700, fontSize: `${settings.fontSize + 8}pt` }}>
          Your Name
        </div>
      )}
      {p.headline && (
        <div style={{ color: "#3b3b3b", marginTop: 2 }}>{p.headline}</div>
      )}
      {contact.length > 0 && (
        <div style={{ color: "#555", fontSize: `${settings.fontSize - 1}pt`, marginTop: 4 }}>
          {contact.join("  |  ")}
        </div>
      )}

      </div>
      <div style={{ height: sectionGap }} />

      {buildRenderModel(doc).map((sec, idx) => (
        <section key={idx} style={{ marginBottom: sectionGap }}>
          <h2
            style={{
              color: accent,
              fontWeight: 700,
              fontSize: `${settings.fontSize + 1}pt`,
              letterSpacing: "0",
              textTransform: "uppercase",
              borderBottom: doc.presentation?.headingRule === false ? "none" : `1px solid ${accent}`,
              paddingBottom: 2,
              marginBottom: 6,
            }}
          >
            {sec.name}
          </h2>

          {sec.type === "summary" && <p style={{ margin: 0 }}>{sec.text}</p>}

          {sec.type === "skills" && (
            <div>
              {sec.groups.map((g, i) => (
                <div key={i} style={{ marginBottom: 2 }}>
                  {sec.groups.length > 1 && (
                    <span style={{ fontWeight: 700 }}>{g.name}: </span>
                  )}
                  <span>{g.items.join(", ")}</span>
                </div>
              ))}
            </div>
          )}

          {sec.type === "experience" &&
            sec.items.map((it) => (
              <div key={it.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>
                  {it.role}
                  {it.company ? `, ${it.company}` : ""}
                </div>
                {(it.location || it.start || it.end) && (
                  <div style={{ color: "#555", fontSize: `${settings.fontSize - 1}pt` }}>
                    {[it.location, dateRange(it.start, it.end)].filter(Boolean).join("  |  ")}
                  </div>
                )}
                {it.bullets.filter(Boolean).length > 0 && (
                  <ul style={{ margin: "3px 0 0 18px", padding: 0 }}>
                    {it.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} style={{ marginBottom: 2 }}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

          {sec.type === "projects" &&
            sec.items.map((it) => (
              <div key={it.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>
                  {it.name}
                  {it.link ? `  —  ${it.link}` : ""}
                </div>
                {it.description && <div>{it.description}</div>}
                {it.bullets.filter(Boolean).length > 0 && (
                  <ul style={{ margin: "3px 0 0 18px", padding: 0 }}>
                    {it.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} style={{ marginBottom: 2 }}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

          {sec.type === "education" &&
            sec.items.map((it) => (
              <div key={it.id} style={{ marginBottom: 6 }}>
                <div style={{ fontWeight: 700 }}>
                  {it.degree}
                  {it.school ? `, ${it.school}` : ""}
                </div>
                {(it.location || it.start || it.end) && (
                  <div style={{ color: "#555", fontSize: `${settings.fontSize - 1}pt` }}>
                    {[it.location, dateRange(it.start, it.end)].filter(Boolean).join("  |  ")}
                  </div>
                )}
                {it.details && <div>{it.details}</div>}
              </div>
            ))}

          {sec.type === "certifications" &&
            sec.items.map((it) => (
              <div key={it.id}>
                {it.name}
                {(it.issuer || it.date) && (
                  <span>
                    {"  —  "}
                    {[it.issuer, it.date, it.expiry ? `Expires ${it.expiry}` : "", it.url].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
            ))}

          {sec.type === "achievements" && (
            <ul style={{ margin: "0 0 0 18px", padding: 0 }}>
              {sec.items.map((a, i) => (
                <li key={i} style={{ marginBottom: 2 }}>{a}</li>
              ))}
            </ul>
          )}
          {(sec.type === "publications" || sec.type === "additional") && sec.items.map(it => <div key={it.id} style={{marginBottom:6}}><strong>{it.title}</strong>{it.details && <p style={{margin:0,whiteSpace:"pre-wrap"}}>{it.details}</p>}</div>)}
        </section>
      ))}
    </div>
  );
}
