import { Reveal } from "./Reveal";

export const SectionHeader = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) => (
  <div className="text-center max-w-2xl mx-auto mb-20">
    <Reveal>
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/50">
        {eyebrow}
      </span>
    </Reveal>
    <Reveal delay={120}>
      <h2 className="font-display text-[34px] sm:text-[40px] md:text-5xl lg:text-[56px] font-semibold text-foreground mt-5 leading-[1.04] text-balance">
        {title}
      </h2>
    </Reveal>
    {description && (
      <Reveal delay={240}>
        <p className="mt-5 text-[17px] md:text-[18px] text-foreground/60 leading-[1.55] max-w-[54ch] mx-auto text-pretty">{description}</p>
      </Reveal>
    )}
  </div>
);
