import { ArrowRight, ShieldCheck, Target, AlertTriangle, KeyRound, FileWarning, Sparkles, CheckCircle2 } from "lucide-react";
import { Reveal } from "./Reveal";
import { useParallax } from "@/hooks/useParallax";

import { AppTransitionLink } from "@/components/AppTransitionLink";

const ScoreRing = ({ value }: { value: number }) => {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-[76px] shrink-0">
      <svg viewBox="0 0 72 72" className="size-full -rotate-90">
        <circle cx="36" cy="36" r={r} className="stroke-foreground/10" strokeWidth="7" fill="none" />
        <circle
          cx="36"
          cy="36"
          r={r}
          className="stroke-foreground"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (c * value) / 100}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-semibold leading-none tracking-tight">{value}</span>
        <span className="text-[9px] text-foreground/50 leading-none mt-0.5">/100</span>
      </div>
    </div>
  );
};

const MetricRow = ({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  detail: string;
}) => (
  <div className="flex items-start gap-3 rounded-xl bg-white/55 border border-white/70 px-3 py-2.5">
    <div className="mt-0.5 size-6 rounded-lg bg-foreground/8 flex items-center justify-center shrink-0">
      <Icon className="w-3.5 h-3.5 text-foreground/70" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium text-foreground/55 uppercase tracking-[0.1em]">{label}</p>
        <span className="font-mono text-[12px] font-semibold text-foreground shrink-0">{value}</span>
      </div>
      <p className="text-[11.5px] text-foreground/70 leading-snug mt-0.5 truncate">{detail}</p>
    </div>
  </div>
);

const MockupCard = () => {
  return (
    <div className="relative w-full max-w-[560px] mx-auto lg:mx-0 lg:ml-auto">
      <div className="backdrop-blur-2xl bg-white/60 border border-white/70 shadow-[0_32px_64px_-20px_hsl(var(--slate-ink)/0.2),inset_0_1px_0_rgba(255,255,255,1)] rounded-[1.75rem] p-6 md:p-7 relative overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-medium text-foreground/50 uppercase tracking-[0.18em]">
              Career intelligence report
            </p>
            <h3 className="font-display font-semibold text-[17px] tracking-tight leading-none mt-1.5">
              Target role · Data Analyst
            </h3>
          </div>
          <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-foreground/8 text-foreground/60">
            Private
          </span>
        </div>

        {/* Score + match */}
        <div className="rounded-2xl bg-white/70 border border-white/80 p-4 flex items-center gap-4">
          <ScoreRing value={68} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-foreground/55 uppercase tracking-[0.12em]">Hirely Score</p>
            <p className="text-[12.5px] text-foreground/75 leading-snug mt-1">
              Solid foundation. Blocked by ATS parsing and 6 missing role skills.
            </p>
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-foreground/60">Target role match</span>
                <span className="font-mono font-semibold text-foreground">61%</span>
              </div>
              <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                <div className="h-full bg-foreground rounded-full" style={{ width: "61%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Findings */}
        <div className="grid gap-2 mt-3">
          <MetricRow icon={AlertTriangle} label="ATS issues" value="4" detail="Two-column layout, image header, table dates" />
          <MetricRow icon={Target} label="Missing skills" value="6" detail="SQL window functions, dbt, A/B testing, Airflow" />
          <MetricRow icon={KeyRound} label="Keyword gaps" value="11" detail="cohort analysis · stakeholder reporting · ETL" />
          <MetricRow icon={FileWarning} label="Weak sections" value="3" detail="Summary, Experience bullets 2–5, Projects" />
        </div>

        {/* Recommendations */}
        <div className="mt-3 rounded-2xl bg-white/70 border border-white/80 p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-foreground/70" />
            <p className="text-[11px] font-medium text-foreground/55 uppercase tracking-[0.12em]">
              Recommended to add
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["Retention cohort dashboard", "dbt model project", "SQL certification", "A/B test writeup"].map((t) => (
              <span
                key={t}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-foreground/8 text-foreground/80"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Next actions */}
        <div className="mt-3 rounded-2xl bg-foreground text-background p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-background/60 mb-2.5">
            Next 3 actions
          </p>
          <ol className="space-y-1.5">
            {[
              "Convert resume to single-column, ATS-safe layout",
              "Rewrite 5 bullets with measurable outcomes",
              "Add SQL + experimentation keywords to summary",
            ].map((s, i) => (
              <li key={s} className="flex items-start gap-2.5 text-[12px] leading-snug text-background/90">
                <span className="mt-0.5 size-4 rounded-full bg-background/15 flex items-center justify-center text-[9px] font-semibold shrink-0">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

const ParallaxMockup = () => {
  const ref = useParallax<HTMLDivElement>(0.04);
  return (
    <div ref={ref} className="reveal-parallax">
      <MockupCard />
    </div>
  );
};

const facts = [
  { icon: ShieldCheck, label: "Private resume analysis" },
  { icon: Target, label: "Role-specific recommendations" },
  { icon: CheckCircle2, label: "ATS-focused feedback" },
  { icon: Sparkles, label: "Skill-gap detection" },
];

export const Hero = () => {
  return (
    <section className="relative pt-32 pb-28 md:pb-32 px-4 lg:px-12 overflow-hidden">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-10 items-center">
        {/* Left: copy */}
        <div className="flex flex-col gap-8 text-center lg:text-left">
          <Reveal delay={60}>
            <span className="inline-flex items-center gap-2 self-center lg:self-start px-3 py-1.5 rounded-full bg-white/60 border border-white/70 text-[12px] font-medium text-foreground/70">
              <span className="size-1.5 rounded-full bg-foreground/70" />
              Career intelligence for your target role
            </span>
          </Reveal>

          <Reveal delay={120}>
            <h1 className="font-display text-[40px] sm:text-[54px] lg:text-[62px] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground text-balance">
              See exactly why your resume is not matching your target role
            </h1>
          </Reveal>

          <Reveal delay={240}>
            <p className="text-[17px] lg:text-[18px] text-foreground/65 max-w-[54ch] mx-auto lg:mx-0 leading-[1.6]">
              Upload your resume, choose a target role, and get a detailed breakdown of your ATS readiness,
              missing skills, keyword gaps, resume weaknesses, and the next steps that actually move you
              closer to hire-ready.
            </p>
          </Reveal>

          <Reveal delay={360}>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <AppTransitionLink
                to="/app"
                className="group inline-flex items-center gap-2 bg-foreground text-background px-7 py-3.5 rounded-full text-[15px] font-medium tracking-[-0.01em] hover:opacity-90 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_hsl(var(--slate-ink)/0.4)]"
              >
                Analyze my resume
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </AppTransitionLink>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[15px] font-medium text-foreground/75 border border-foreground/15 hover:border-foreground/30 hover:text-foreground transition-colors"
              >
                See what you get
              </a>
            </div>
          </Reveal>

          <Reveal delay={480}>
            <div className="pt-6 mt-1 border-t border-foreground/10 grid grid-cols-2 gap-x-6 gap-y-3 max-w-[480px] mx-auto lg:mx-0">
              {facts.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-left">
                  <Icon className="w-4 h-4 text-foreground/55 shrink-0" />
                  <span className="text-[13px] text-foreground/70 leading-snug">{label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Right: product preview */}
        <Reveal delay={300}>
          <ParallaxMockup />
        </Reveal>
      </div>
    </section>
  );
};
