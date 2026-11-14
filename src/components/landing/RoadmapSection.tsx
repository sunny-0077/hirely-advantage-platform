import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";

const milestones = [
  { month: "Month 1", title: "SQL fundamentals", tag: "Skill" },
  { month: "Month 3", title: "Lead a cross-team initiative", tag: "Project" },
  { month: "Month 6", title: "AWS Solutions Architect", tag: "Cert" },
  { month: "Month 12", title: "Public talk at industry conf", tag: "Visibility" },
  { month: "Month 24", title: "Mentor 2 junior PMs", tag: "Leadership" },
  { month: "Month 36", title: "Director of Product", tag: "Role" },
];

export const RoadmapSection = () => {
  return (
    <section id="roadmap" className="px-4 py-28 relative">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Reveal>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/50">
              ★ The Sticky Bonus
            </span>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mt-4 leading-[1.05]">
              Your <span className="text-gradient">Skill Gap Roadmap</span>
            </h2>
          </Reveal>
          <Reveal delay={240}>
            <p className="mt-6 text-lg text-foreground/65 leading-relaxed">
              Land the job — then come back. Hirely analyzes the role you want in 3 years and
              generates a month-by-month plan of certifications, skills, and projects to get you
              promoted.
            </p>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <div className="glass-strong rounded-3xl p-8 md:p-12">
            <div className="flex items-center justify-between mb-10">
              <div>
                <p className="text-xs uppercase tracking-wider text-foreground/50">From</p>
                <p className="font-display text-xl font-semibold text-foreground mt-1">Senior PM @ Notion</p>
              </div>
              <div className="hidden md:block flex-1 mx-8 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-foreground/50">Target · 3 yrs</p>
                <p className="font-display text-xl font-semibold text-foreground mt-1">Director of Product</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {milestones.map((m, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className="glass rounded-2xl p-5 h-full hover:bg-white/70 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-foreground/50">{m.month}</span>
                      <span className="text-[10px] uppercase tracking-wider text-foreground/60 px-2 py-0.5 rounded-full bg-foreground/5">
                        {m.tag}
                      </span>
                    </div>
                    <p className="font-display text-lg font-semibold text-foreground leading-tight">
                      {m.title}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
