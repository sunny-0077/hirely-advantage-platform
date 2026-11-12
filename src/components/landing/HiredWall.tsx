import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";
import { BadgeCheck, Linkedin } from "lucide-react";

const companies = [
  "Stripe", "Linear", "Figma", "Notion", "Datadog",
  "Vercel", "Anthropic", "OpenAI", "Ramp", "Airbnb",
];

const stories = [
  {
    initials: "MR",
    color: "hsl(var(--ethereal-blue))",
    name: "Maya Rodriguez",
    role: "Senior PM → Stripe",
    outcome: "47 days from signup to signed offer.",
  },
  {
    initials: "DK",
    color: "hsl(var(--soft-lilac))",
    name: "David Kim",
    role: "Eng Manager → Datadog",
    outcome: "3 onsites, 2 offers, $58k base bump.",
  },
  {
    initials: "PS",
    color: "hsl(var(--warm-blush))",
    name: "Priya Shah",
    role: "Director of Design → Figma",
    outcome: "First reply in 6 days after 4 silent months.",
  },
];

export const HiredWall = () => {
  // Duplicate the list so the marquee loops seamlessly
  const marquee = [...companies, ...companies];

  return (
    <section className="px-4 py-28 relative">
      <SectionHeader
        eyebrow="Outcomes"
        title="Hired at companies they actually wanted."
        description="Not page views. Not waitlist signups. Real offers, signed within weeks of starting."
      />

      <div className="mx-auto max-w-6xl">
        {/* Marquee */}
        <Reveal>
          <div className="glass rounded-3xl py-6 overflow-hidden relative group">
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <div className="flex gap-12 animate-marquee group-hover:[animation-play-state:paused]">
              {marquee.map((c, i) => (
                <span
                  key={i}
                  className="font-display text-2xl md:text-3xl font-semibold text-foreground/55 whitespace-nowrap shrink-0 tracking-tight"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Stories */}
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          {stories.map((s, i) => (
            <Reveal key={s.name} delay={i * 120}>
              <div className="glass-strong rounded-3xl p-7 h-full flex flex-col">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-display font-semibold text-foreground"
                      style={{ background: s.color }}
                    >
                      {s.initials}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground leading-tight">{s.name}</p>
                      <p className="text-xs text-foreground/55 mt-0.5">{s.role}</p>
                    </div>
                  </div>
                  <a href="#" aria-label="LinkedIn profile" className="text-foreground/40 hover:text-foreground transition-colors">
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>

                <p className="font-display text-lg text-foreground leading-snug flex-1">
                  "{s.outcome}"
                </p>

                <div className="mt-6 pt-5 border-t border-foreground/10 flex items-center gap-1.5 text-xs text-foreground/60">
                  <BadgeCheck className="w-3.5 h-3.5 text-sky-700" />
                  Verified outcome
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
