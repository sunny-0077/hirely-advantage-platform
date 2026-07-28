import { ReactNode } from "react";
import { Reveal } from "./Reveal";
import { cn } from "@/lib/utils";

interface FeatureBlockProps {
  index: number;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  visual: ReactNode;
  reverse?: boolean;
}

export const FeatureBlock = ({
  index,
  eyebrow,
  title,
  description,
  bullets,
  visual,
  reverse,
}: FeatureBlockProps) => {
  return (
    <div className="px-4 py-24 md:py-32">
      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-14 md:gap-20 items-center">
        <Reveal className={cn("order-2", reverse ? "md:order-2" : "md:order-1")}>
          <div className="flex items-center gap-3 mb-6">
            <span className="font-display text-sm font-medium text-foreground/45 tabular-nums">0{index}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/50">
              {eyebrow}
            </span>
          </div>
          <h3 className="font-display text-[30px] md:text-4xl lg:text-[46px] font-semibold text-foreground leading-[1.06] text-balance">
            {title}
          </h3>
          <p className="mt-6 text-[17px] md:text-[18px] text-foreground/60 leading-[1.55] max-w-[52ch]">{description}</p>
          <ul className="mt-8 space-y-3.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-foreground/80">
                <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-foreground/35 shrink-0" />
                <span className="text-[15px] leading-[1.55]">{b}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={180} className={cn("order-1", reverse ? "md:order-1" : "md:order-2")}>
          {visual}
        </Reveal>
      </div>
    </div>
  );
};
