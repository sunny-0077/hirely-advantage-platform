import { useEffect, useMemo, useRef, useState } from "react";
import type { ResumeDocument } from "@/lib/resumeBuilder/types";
import { documentFontCss } from "@/lib/resumeBuilder/fonts";
import { A4_HEIGHT, A4_WIDTH, paginateMeasurements } from "@/lib/resumeBuilder/pagination";
import { resolvedLayout } from "@/lib/resumeBuilder/visual";
import { buildVisualBlocks, splitVisualColumns, VisualResumePage } from "./VisualResumePage";

export function ResumePreview({ doc }: { doc: ResumeDocument }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const blocks = useMemo(() => splitVisualColumns(buildVisualBlocks(doc), resolvedLayout(doc)), [doc]);
  const [plans, setPlans] = useState<{ main: string[][]; rail: string[][] }>({ main: [[]], rail: [[]] });
  const [readyDoc, setReadyDoc] = useState<ResumeDocument | null>(null);
  useEffect(() => {
    let active = true;
    const measure = async () => {
      await Promise.all([document.fonts.load('14px "Hirely Document Sans"'), document.fonts.load('700 14px "Hirely Document Sans"'), document.fonts.load('14px "Hirely Document Serif"'), document.fonts.load('700 14px "Hirely Document Serif"'), document.fonts.load('14px "Hirely Document Mono"')]);
      if (!active || !measureRef.current) return;
      const page = measureRef.current.querySelector<HTMLElement>(".resume-page"); if (!page) return;
      const main = page.querySelector<HTMLElement>('[data-resume-flow="main"]'); if (!main) return;
      const start = main.getBoundingClientRect().top - page.getBoundingClientRect().top;
      const measureColumn = (kind: "main" | "rail") => {
        const flow = page.querySelector<HTMLElement>(`[data-resume-flow="${kind}"]`);
        if (!flow) return [[]];
        const padding = parseFloat(getComputedStyle(flow).paddingTop) + parseFloat(getComputedStyle(flow).paddingBottom);
        const items = Array.from(flow.querySelectorAll<HTMLElement>("[data-block-id]")).map(el => ({ id: el.dataset.blockId ?? "", height: el.getBoundingClientRect().height + parseFloat(getComputedStyle(el).marginBottom) }));
        return paginateMeasurements(items, A4_HEIGHT - start - 62 - padding, A4_HEIGHT - 160 - padding);
      };
      setPlans({ main: measureColumn("main"), rail: measureColumn("rail") }); setReadyDoc(doc);
    };
    void measure().catch(() => { if (active) setReadyDoc(null); });
    return () => { active = false; };
  }, [doc, blocks]);
  const total = Math.max(plans.main.length, plans.rail.length);
  return <div className="relative resume-preview" data-resume-ready={readyDoc === doc ? "true" : "false"}>
    <style>{documentFontCss}</style>
    <div className="resume-measure" aria-hidden="true" ref={measureRef}><VisualResumePage doc={doc} main={blocks.main} rail={blocks.rail} measure /></div>
    <div className="resume-pages">{Array.from({ length: total }, (_, i) => <VisualResumePage key={i} doc={doc} page={i} total={total} main={blocks.main.filter(b => plans.main[i]?.includes(b.id))} rail={blocks.rail.filter(b => plans.rail[i]?.includes(b.id))} />)}</div>
  </div>;
}

export function FittedResumePreview({ doc, firstPageOnly = false, maxScale = 1 }: { doc: ResumeDocument; firstPageOnly?: boolean; maxScale?: number }) {
  const ref = useRef<HTMLDivElement>(null), content = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5), [height, setHeight] = useState(A4_HEIGHT);
  useEffect(() => {
    const container = ref.current, inner = content.current; if (!container || !inner) return;
    const observer = new ResizeObserver(() => { setScale(Math.min(maxScale, container.clientWidth / A4_WIDTH)); setHeight(firstPageOnly ? A4_HEIGHT : inner.offsetHeight); });
    observer.observe(container); observer.observe(inner); return () => observer.disconnect();
  }, [firstPageOnly, maxScale]);
  return <div className="resume-canvas-viewport" ref={ref} style={{ height: height * scale }}><div className="resume-canvas-scaled" ref={content} style={{ width: A4_WIDTH, transform: `scale(${scale})` }}><ResumePreview doc={doc} /></div></div>;
}