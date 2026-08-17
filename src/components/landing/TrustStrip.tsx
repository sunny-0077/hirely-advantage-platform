import { ShieldCheck, Target, ScanLine, Layers, ListChecks } from "lucide-react";
import { Reveal } from "./Reveal";

const items = [
  {
    icon: ShieldCheck,
    title: "Private resume analysis",
    body: "Your resume stays tied to your account. Nothing is shared or published.",
  },
  {
    icon: Target,
    title: "Role-specific recommendations",
    body: "Every insight is scored against the target role you choose, not a generic template.",
  },
  {
    icon: ScanLine,
    title: "ATS-focused feedback",
    body: "Parsing, structure, and formatting checks modelled on real applicant tracking systems.",
  },
  {
    icon: Layers,
    title: "Skill-gap detection",
    body: "See the skills and keywords the role expects that your profile does not yet show.",
  },
  {
    icon: ListChecks,
    title: "Actionable improvement plan",
    body: "A prioritised list of fixes, projects, and skills — in the order worth doing them.",
  },
];

export const TrustStrip = () => (
  <section className="px-4 -mt-8 md:-mt-14 pb-14 md:pb-20 relative z-10">
    <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {items.map(({ icon: Icon, title, body }, i) => (
        <Reveal key={title} delay={i * 80}>
          <div className="glass-strong rounded-2xl p-5 h-full">
            <div className="size-8 rounded-xl bg-foreground/8 flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-foreground/75" />
            </div>
            <p className="font-display text-[15px] font-semibold tracking-tight text-foreground leading-snug">
              {title}
            </p>
            <p className="mt-1.5 text-[12.5px] text-foreground/62 leading-relaxed">{body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  </section>
);
