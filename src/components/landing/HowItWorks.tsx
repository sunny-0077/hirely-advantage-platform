import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";

const steps = [
  { n: "01", title: "Upload", desc: "Drop your resume and the role you want." },
  { n: "02", title: "Analyze", desc: "AI simulates the ATS and benchmarks against the market." },
  { n: "03", title: "Optimize", desc: "Rewrite bullets, draft outreach, rehearse interviews." },
  { n: "04", title: "Land", desc: "Walk into offers — then plan the next promotion." },
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="px-4 py-28 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="How it works"
          title="From upload to offer in four steps."
          description="A complete workflow — engineered to compress the gap between submitting an application and signing the contract."
        />

        <div className="relative grid md:grid-cols-4 gap-8">
          <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-foreground/25 to-transparent" />
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 120}>
              <div className="relative flex flex-col items-center text-center">
                <div className="w-24 h-24 glass-strong rounded-full flex items-center justify-center mb-6">
                  <span className="font-display text-xl font-semibold text-foreground tabular-nums">{s.n}</span>
                </div>
                <h4 className="font-display text-[19px] font-semibold text-foreground leading-tight">{s.title}</h4>
                <p className="mt-2.5 text-[14px] text-foreground/55 leading-[1.55] max-w-[200px]">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
