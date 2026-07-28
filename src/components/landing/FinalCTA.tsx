import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { useParallax } from "@/hooks/useParallax";

export const FinalCTA = () => {
  const parallaxRef = useParallax<HTMLDivElement>(0.05);
  return (
    <section id="cta" className="px-4 py-28">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div ref={parallaxRef} className="reveal-parallax glass-strong rounded-[2rem] p-10 md:p-16 text-center relative overflow-hidden">

            <h2 className="font-display text-4xl md:text-6xl font-semibold text-foreground leading-[1.05]">
              Your next role is <span className="text-gradient">closer than you think.</span>
            </h2>
            <p className="mt-6 text-lg text-foreground/65 max-w-xl mx-auto">
              Start with a free Market Readiness Score. No credit card. Real, actionable rewrites in
              under 60 seconds.
            </p>

            <form
              className="mt-10 flex flex-col sm:flex-row items-stretch gap-3 max-w-md mx-auto"
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = "/app";
              }}
            >
              <input
                type="email"
                placeholder="you@work.com"
                className="flex-1 glass rounded-full px-5 py-3.5 text-sm text-foreground placeholder:text-foreground/40 outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <button
                type="submit"
                className="group inline-flex items-center justify-center gap-2 bg-foreground text-background px-7 py-3.5 rounded-full text-sm font-medium hover:opacity-90 transition-all"
              >
                Get my score
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <p className="mt-6 text-xs text-foreground/45">
              Free forever for analysis · Premium plans from $19/mo
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
