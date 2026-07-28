import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";

const testimonials = [
  {
    quote: "Hirely's ATS simulator caught keywords every recruiter said I was missing. 3 offers in 5 weeks.",
    name: "Maya R.",
    role: "Senior PM · ex-Stripe",
  },
  {
    quote: "The voice coach rewired how I tell stories. I stopped rambling and started landing punchlines.",
    name: "David K.",
    role: "Engineering Manager · Datadog",
  },
  {
    quote: "The Skill Gap Roadmap is the only career tool I've actually opened twice. It just keeps paying off.",
    name: "Priya S.",
    role: "Director of Design · Figma",
  },
];

export const Testimonials = () => {
  return (
    <section className="px-4 py-28 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Loved by candidates"
          title="Built for the top of the market."
        />
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <Reveal key={i} delay={i * 120}>
              <div className="glass-strong rounded-3xl p-8 h-full flex flex-col">
                <p className="font-display text-[18px] text-foreground leading-[1.5] flex-1 text-balance">
                  "{t.quote}"
                </p>
                <div className="mt-6 pt-6 border-t border-foreground/10">
                  <p className="font-medium text-[14px] text-foreground tracking-[-0.005em]">{t.name}</p>
                  <p className="text-[12.5px] text-foreground/55 mt-0.5">{t.role}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
