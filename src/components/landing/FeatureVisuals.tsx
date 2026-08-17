import { FileText, Linkedin, Mail, Mic, Sparkles, TrendingUp } from "lucide-react";

export const VisualATS = () => (
  <div className="glass-strong rounded-3xl p-6 relative">
    <div className="flex items-start justify-between mb-5">
      <div>
        <p className="text-xs uppercase tracking-wider text-foreground/50">Resume.pdf</p>
        <p className="font-display font-semibold text-lg text-foreground mt-1">ATS Simulator</p>
      </div>
      <div className="glass rounded-full px-3 py-1 text-xs text-foreground/70 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
        Live scan
      </div>
    </div>

    <div className="space-y-2 mb-5">
      {[92, 78, 64, 88].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-foreground/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground/80 rounded-full"
              style={{ width: `${w}%`, transition: "width 1s ease-out" }}
            />
          </div>
          <span className="text-xs font-mono text-foreground/50 w-10 text-right">{w}%</span>
        </div>
      ))}
    </div>

    <div className="glass rounded-2xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-foreground/60" />
        <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Impact Rewrite</span>
      </div>
      <p className="text-xs text-foreground/45 line-through">Helped improve product metrics.</p>
      <p className="text-sm text-foreground font-medium mt-1">
        Drove 38% lift in activation through 6 A/B tests on onboarding.
      </p>
    </div>

    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-3.5 h-3.5 text-foreground/60" />
        <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Filter Bypass</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["roadmap", "stakeholders", "OKRs", "SQL"].map((k) => (
          <span key={k} className="text-xs px-2.5 py-1 rounded-full bg-foreground text-background">
            +{k}
          </span>
        ))}
      </div>
    </div>
  </div>
);

export const VisualOutreach = () => (
  <div className="relative h-[440px]">
    <div className="absolute top-0 left-0 right-8 glass-strong rounded-2xl p-5 rotate-[-3deg]">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-foreground/60" />
        <span className="text-xs font-medium text-foreground/70">Cover Letter</span>
      </div>
      <div className="space-y-1.5">
        <div className="h-2 bg-foreground/10 rounded-full w-full" />
        <div className="h-2 bg-foreground/10 rounded-full w-[85%]" />
        <div className="h-2 bg-foreground/10 rounded-full w-[92%]" />
        <div className="h-2 bg-foreground/10 rounded-full w-[70%]" />
      </div>
    </div>

    <div className="absolute top-32 left-8 right-0 glass-strong rounded-2xl p-5 rotate-[2deg]">
      <div className="flex items-center gap-2 mb-3">
        <Linkedin className="w-4 h-4 text-foreground/60" />
        <span className="text-xs font-medium text-foreground/70">LinkedIn DM · 50 words</span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">
        "Hi Sarah — saw you led the Series B at Linear. I shipped the same kind of zero-to-one
        billing primitives at Stripe. Open to a 15-min chat next week?"
      </p>
    </div>

    <div className="absolute bottom-0 left-0 right-8 glass-strong rounded-2xl p-5 rotate-[-1deg]">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-4 h-4 text-foreground/60" />
        <span className="text-xs font-medium text-foreground/70">Follow-Up · Day 5</span>
      </div>
      <div className="space-y-1.5">
        <div className="h-2 bg-foreground/10 rounded-full w-[95%]" />
        <div className="h-2 bg-foreground/10 rounded-full w-[78%]" />
        <div className="h-2 bg-foreground/10 rounded-full w-[88%]" />
      </div>
    </div>
  </div>
);

export const VisualVoiceCoach = () => (
  <div className="glass-strong rounded-3xl p-6">
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center">
          <Mic className="w-4 h-4" />
        </div>
        <div>
          <p className="font-display font-semibold text-foreground">Behavioral Coach</p>
          <p className="text-xs text-foreground/50">Curveball: "Tell me about a failure"</p>
        </div>
      </div>
      <span className="text-xs font-mono text-foreground/50">02:14</span>
    </div>

    {/* Waveform */}
    <div className="flex items-center justify-center gap-1 h-20 mb-5 glass rounded-2xl">
      {Array.from({ length: 40 }).map((_, i) => {
        const h = 20 + Math.abs(Math.sin(i * 0.6)) * 50;
        return (
          <div
            key={i}
            className="w-1 rounded-full bg-foreground/60"
            style={{ height: `${h}%`, opacity: i < 28 ? 1 : 0.25 }}
          />
        );
      })}
    </div>

    {/* STAR */}
    <div className="grid grid-cols-4 gap-2 mb-4">
      {[
        { l: "S", on: true }, { l: "T", on: true }, { l: "A", on: true }, { l: "R", on: false },
      ].map((s, i) => (
        <div
          key={i}
          className={`rounded-xl py-2.5 text-center text-sm font-display font-semibold ${
            s.on ? "bg-foreground text-background" : "glass text-foreground/40"
          }`}
        >
          {s.l}
        </div>
      ))}
    </div>

    <div className="grid grid-cols-2 gap-2">
      <div className="glass rounded-xl p-3">
        <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Pacing</p>
        <p className="font-display text-lg font-semibold mt-0.5">142 wpm</p>
      </div>
      <div className="glass rounded-xl p-3">
        <p className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium">Filler words</p>
        <p className="font-display text-lg font-semibold mt-0.5">3 "um"</p>
      </div>
    </div>
  </div>
);
