import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";
import { Sparkles, TrendingUp, Search, Zap } from "lucide-react";

export const ProductShowcase = () => {
  return (
    <section className="px-4 py-28 relative">
      <SectionHeader
        eyebrow="Product preview"
        title="The product, no mockups."
        description="A live look at the workspace candidates open every morning until they sign their offer."
      />

      <div className="mx-auto max-w-6xl relative">
        {/* Aurora glow behind the frame */}
        <div className="absolute -inset-10 -z-10 opacity-70 blur-3xl pointer-events-none">
          <div className="absolute left-[10%] top-[10%] w-[40%] h-[60%] rounded-full bg-[hsl(var(--soft-lilac))]" />
          <div className="absolute right-[5%] top-[20%] w-[35%] h-[55%] rounded-full bg-[hsl(var(--ethereal-blue))]" />
          <div className="absolute left-[35%] bottom-[5%] w-[35%] h-[50%] rounded-full bg-[hsl(var(--warm-blush))]" />
        </div>

        <Reveal>
          <div className="relative rounded-[1.75rem] overflow-hidden shadow-[var(--shadow-float)] bg-white border border-foreground/10">
            {/* macOS title bar */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-[hsl(240_15%_97%)] border-b border-foreground/5">
              <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <span className="w-3 h-3 rounded-full bg-[#28C840]" />
              <div className="flex-1 flex justify-center">
                <div className="px-3 py-1 rounded-md bg-white/80 text-[11px] text-foreground/50 font-mono border border-foreground/5">
                  app.hirely.ai/workspace
                </div>
              </div>
            </div>

            {/* Mock app body */}
            <div className="grid grid-cols-12 gap-0 bg-[hsl(240_25%_98.5%)]">
              {/* Sidebar */}
              <aside className="hidden md:flex col-span-2 flex-col gap-1 p-4 border-r border-foreground/5 bg-white">
                <div className="text-[10px] uppercase tracking-wider text-foreground/40 font-medium px-2 mb-1">Workspace</div>
                {[
                  { l: "Resume", active: true },
                  { l: "Outreach", active: false },
                  { l: "Voice Coach", active: false },
                  { l: "Roadmap", active: false },
                ].map((i) => (
                  <div
                    key={i.l}
                    className={`text-xs px-2.5 py-2 rounded-lg ${
                      i.active ? "bg-foreground text-background font-medium" : "text-foreground/65"
                    }`}
                  >
                    {i.l}
                  </div>
                ))}
              </aside>

              {/* Main panel */}
              <div className="col-span-12 md:col-span-7 p-6 md:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-foreground/45 font-medium">resume_v7.pdf</p>
                    <h3 className="font-display text-xl font-semibold mt-0.5">Senior PM @ Stripe</h3>
                  </div>
                  <div className="glass rounded-full px-3 py-1 text-[11px] text-foreground/70 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live scan
                  </div>
                </div>

                {/* Score row */}
                <div className="flex items-center gap-5 p-4 rounded-2xl bg-white border border-foreground/5">
                  <div className="relative w-16 h-16">
                    <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                      <circle
                        cx="32" cy="32" r="26" fill="none"
                        stroke="hsl(var(--foreground))" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${(94 / 100) * 163.36} 163.36`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-display font-semibold text-lg">94</div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Market Readiness Score</p>
                    <p className="text-xs text-foreground/55 mt-0.5">+52 pts since v1 · top 6% of applicants</p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>

                {/* Rewrite card */}
                <div className="p-4 rounded-2xl bg-white border border-foreground/5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-foreground/60" />
                    <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">AI Rewrite · bullet 3</span>
                  </div>
                  <p className="text-xs text-foreground/45 line-through">Helped improve product onboarding metrics.</p>
                  <p className="text-sm text-foreground font-medium leading-relaxed">
                    Drove <mark className="bg-[hsl(var(--soft-lilac))] rounded px-1">38% activation lift</mark> across 6 A/B tests on onboarding, unlocking <mark className="bg-[hsl(var(--ethereal-blue))] rounded px-1">$1.2M ARR</mark>.
                  </p>
                </div>

                {/* Keywords */}
                <div className="p-4 rounded-2xl bg-white border border-foreground/5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Search className="w-3.5 h-3.5 text-foreground/60" />
                    <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Keyword gap</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["roadmap", "OKRs", "stakeholders", "SQL", "A/B testing", "activation"].map((k) => (
                      <span key={k} className="text-[11px] px-2 py-1 rounded-full bg-foreground text-background font-medium">+{k}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right rail */}
              <aside className="hidden md:flex col-span-3 flex-col gap-3 p-5 border-l border-foreground/5 bg-white">
                <div className="text-[10px] uppercase tracking-wider text-foreground/40 font-medium">Today</div>
                <div className="p-3 rounded-xl bg-[hsl(var(--soft-lilac))]/40">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/60 font-medium">
                    <Zap className="w-3 h-3" /> Streak
                  </div>
                  <p className="font-display text-2xl font-semibold mt-1">12 days</p>
                </div>
                <div className="p-3 rounded-xl bg-[hsl(var(--ethereal-blue))]/40">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/60 font-medium">Applications</p>
                  <p className="font-display text-2xl font-semibold mt-1">7 / 10</p>
                  <div className="mt-2 h-1.5 rounded-full bg-white/60 overflow-hidden">
                    <div className="h-full bg-foreground rounded-full" style={{ width: "70%" }} />
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-foreground/5">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Next interview</p>
                  <p className="text-sm font-medium mt-1">Stripe · onsite</p>
                  <p className="text-[11px] text-foreground/55 mt-0.5">Thu, 2:00 PM</p>
                </div>
              </aside>
            </div>
          </div>
        </Reveal>

        {/* Floating annotation pills (desktop only) */}
        <div className="hidden lg:block">
          <div className="absolute top-[28%] -left-4 glass-strong rounded-full px-4 py-2 text-xs font-medium text-foreground shadow-[var(--shadow-glass)] animate-fade-in">
            <span className="text-foreground/55">①</span> Live ATS score
          </div>
          <div className="absolute top-[58%] -right-6 glass-strong rounded-full px-4 py-2 text-xs font-medium text-foreground shadow-[var(--shadow-glass)] animate-fade-in">
            <span className="text-foreground/55">②</span> AI rewrite suggestions
          </div>
          <div className="absolute bottom-[12%] left-[18%] glass-strong rounded-full px-4 py-2 text-xs font-medium text-foreground shadow-[var(--shadow-glass)] animate-fade-in">
            <span className="text-foreground/55">③</span> Missing keywords
          </div>
        </div>
      </div>
    </section>
  );
};
