import { ArrowRight, Play, Star, Sparkles, ArrowDown } from "lucide-react";
import { Reveal } from "./Reveal";
import { useParallax } from "@/hooks/useParallax";

import { AppTransitionLink } from "@/components/AppTransitionLink";


const MockupCard = () => {
  return (
    <div className="relative w-full max-w-[560px] mx-auto lg:mx-0 lg:ml-auto lg:translate-x-8 transform lg:rotate-[4deg] hover:rotate-[2deg] transition-transform duration-700 ease-out">
      <div className="[animation:float-y_6s_ease-in-out_infinite] motion-reduce:animate-none">
      <div className="backdrop-blur-2xl bg-white/55 border border-white/70 shadow-[0_32px_64px_-16px_hsl(var(--slate-ink)/0.18),inset_0_1px_0_rgba(255,255,255,1)] rounded-[2rem] p-9 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-medium text-foreground/50 uppercase tracking-[0.18em]">
              Resume rewrite
            </p>
            <h3 className="font-display font-semibold text-lg tracking-tight leading-none mt-1.5">
              47 minutes apart
            </h3>
          </div>
          <div className="size-2 rounded-full bg-foreground/70 animate-pulse" />
        </div>

        {/* BEFORE card */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-[13px] text-foreground font-bold px-2.5 py-1 rounded-md bg-foreground/10 flex items-center gap-1.5">
              <span className="text-[14px] leading-none">❌</span> Before <span className="font-medium text-foreground/60">— Weak resume</span>
            </span>
            <span className="text-base font-mono tracking-tight text-foreground/80 font-semibold">42 / 100</span>
          </div>
          <div className="rounded-2xl bg-white/50 border border-white/60 p-4">
            <p className="text-xs font-semibold text-foreground/85">Senior Product Manager</p>
            <ul className="mt-2 space-y-1.5">
              <li className="text-[12px] text-foreground/75 leading-snug flex gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-foreground/50 shrink-0" />
                Worked on improving onboarding metrics.
              </li>
              <li className="text-[12px] text-foreground/75 leading-snug flex gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-foreground/50 shrink-0" />
                Helped the team with product decisions.
              </li>
            </ul>
          </div>
          <div className="mt-2 h-1 rounded-full bg-foreground/5 overflow-hidden">
            <div className="h-full bg-foreground/30 rounded-full" style={{ width: "42%" }} />
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center my-3">
          <div className="size-9 rounded-full bg-foreground text-background flex items-center justify-center shadow-md">
            <ArrowDown className="w-4 h-4" />
          </div>
        </div>

        {/* AFTER card */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-[13px] text-background font-bold px-2.5 py-1 rounded-md bg-foreground flex items-center gap-1.5">
              <span className="text-[14px] leading-none">✅</span> After <span className="font-medium text-background/70">— Optimized</span>
            </span>
            <span className="text-base font-mono tracking-tight text-foreground font-bold">94 / 100</span>
          </div>
          <div className="rounded-2xl bg-white/85 border border-white p-4 shadow-[0_8px_24px_-12px_hsl(var(--slate-ink)/0.18)]">
            <p className="text-xs font-semibold text-foreground">Senior Product Manager</p>
            <ul className="mt-2 space-y-1.5">
              <li className="text-[12px] text-foreground leading-snug flex gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-foreground shrink-0" />
                <span>
                  Drove{" "}
                  <span className="font-semibold border-b border-foreground/40">38% activation lift</span>{" "}
                  across 6 A/B tests.
                </span>
              </li>
              <li className="text-[12px] text-foreground leading-snug flex gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-foreground shrink-0" />
                <span>
                  Led{" "}
                  <span className="font-semibold border-b border-foreground/40">$4.2M roadmap</span>{" "}
                  across 3 squads.
                </span>
              </li>
            </ul>
          </div>
          <div className="mt-2 h-1 rounded-full bg-foreground/5 overflow-hidden">
            <div className="h-full bg-foreground rounded-full" style={{ width: "94%" }} />
          </div>
        </div>
      </div>

      {/* Floating decorative pill */}
      <div className="absolute -top-6 -left-8 transform -rotate-[8deg]">
        <div className="px-4 py-3 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-lg flex items-center gap-3 [animation:float-y_5s_ease-in-out_infinite] motion-reduce:animate-none">
          <div className="w-8 h-8 rounded-full bg-[hsl(var(--warm-blush))] flex items-center justify-center text-foreground font-bold text-sm">
            ↗
          </div>
          <div className="text-xs font-semibold text-foreground leading-tight">
            +52 ATS pts
            <br />
            <span className="text-foreground/65 font-medium">in one rewrite</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export const Hero = () => {
  return (
    <section className="relative pt-32 pb-24 px-4 lg:px-12 overflow-hidden">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-10 items-center">
        {/* Left: copy */}
        <div className="flex flex-col gap-9 text-center lg:text-left">
          <Reveal delay={120}>
            <h1 className="font-display text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.04] text-foreground lg:text-7xl">
              From Ignored to
              <br />
              <span className="relative inline-block">
                <span className="text-gradient">Interviewed</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-[hsl(var(--warm-blush)/0.7)] -z-10 rounded-full transform -rotate-1" />
              </span>
              <br className="sm:hidden" /> — In Minutes.
            </h1>
          </Reveal>

          <Reveal delay={240}>
            <p className="text-lg lg:text-xl text-foreground/65 max-w-[48ch] mx-auto lg:mx-0 leading-relaxed">
              Upload your resume and instantly get your ATS score, missing keywords, and exact fixes to get{" "}
              <span className="relative inline-block font-semibold text-foreground">
                more interviews
                <span className="absolute bottom-0.5 left-0 w-full h-2.5 bg-[hsl(213_100%_75%/0.55)] -z-10 rounded-full transform -rotate-1" />
              </span>.
            </p>
          </Reveal>

          <Reveal delay={360}>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <AppTransitionLink
                to="/app"
                className="group inline-flex items-center gap-2 bg-foreground text-background px-7 py-3.5 rounded-full text-sm font-medium hover:opacity-90 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_hsl(var(--slate-ink)/0.4)]"
              >
                Get My Resume Score
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </AppTransitionLink>
              <a
                href="#features"
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-full bg-white/40 backdrop-blur-md border border-foreground/10 text-foreground text-sm font-medium hover:bg-white/70 transition-colors"
              >
                <span className="size-6 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <Play className="w-3 h-3 text-foreground fill-foreground ml-0.5" />
                </span>
                Watch Demo
              </a>
            </div>
          </Reveal>

          <Reveal delay={480}>
            <div className="pt-6 mt-2 border-t border-foreground/5 flex flex-col gap-5">
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-sm font-medium text-foreground/60">
                  4.9 from 2,400+ candidates hired at
                </span>
              </div>
              <div className="flex items-center justify-center lg:justify-start flex-wrap gap-x-8 gap-y-3 opacity-50">
                <span className="font-display font-bold text-lg tracking-tighter uppercase text-foreground">
                  Omnisearch
                </span>
                <span className="font-sans font-medium text-lg tracking-widest text-foreground">
                  VANGUARD
                </span>
                <span className="font-display font-semibold text-xl tracking-tight lowercase text-foreground">
                  streamer
                </span>
                <span className="font-display italic font-medium text-lg text-foreground">
                  Lumina
                </span>
                <span className="font-display font-bold text-lg tracking-tight text-foreground">
                  Northwind
                </span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Right: mockup */}
        <Reveal delay={300}>
          <ParallaxMockup />
        </Reveal>

      </div>
    </section>
  );
};
