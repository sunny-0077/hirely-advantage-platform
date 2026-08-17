import { useEffect, useState } from "react";
import { Check, Sparkles, Rocket, Zap, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";
import { cn } from "@/lib/utils";
import type { AppPlan } from "@/lib/entitlements";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Plan = {
  id: string;
  name: string;
  price: string;
  cadence?: string;
  was?: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  cta: string;
  highlight?: boolean;
  badge?: string;
  tone?: "glass" | "dark";
};

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    tagline: "A taste, not a meal.",
    icon: Sparkles,
    features: [
      "1 resume upload",
      "ATS score only (no breakdown)",
      "2 improvement suggestions",
      "1 cover letter (watermarked)",
      "3 interview questions",
      "No export",
    ],
    cta: "Start free",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    cadence: "/month",
    tagline: "Impulse-buy territory, full power.",
    icon: Zap,
    badge: "Most Popular",
    highlight: true,
    tone: "dark",
    features: [
      "15 resume analyses / month",
      "Full ATS breakdown",
      "Resume enhancement",
      "20 cover letters / month",
      "Job description matching",
      "PDF + DOCX export",
      "5 mock interviews / month",
      "Resume edit history",
    ],
    cta: "Upgrade to Pro",
  },
  {
    id: "advanced",
    name: "Advanced",
    price: "$29",
    cadence: "/month",
    tagline: "Justified by feature depth.",
    icon: Rocket,
    features: [
      "Unlimited resume analyses",
      "100 cover letters / month",
      "Unlimited resume versions",
      "Advanced JD matching",
      "Full mock interview simulator",
      "Real-time answer feedback",
      "Career gap analysis",
      "Missing skills roadmap",
      "Application tracker",
      "Priority AI generation",
      "LinkedIn profile optimizer (new)",
    ],
    cta: "Go Advanced",
  },
  {
    id: "teams",
    name: "Teams",
    price: "$79",
    cadence: "/month",
    tagline: "New — for 5 users.",
    icon: Building2,
    features: [
      "Everything in Advanced",
      "5 team seats",
      "Admin dashboard",
      "Bulk resume screening",
      "Great for bootcamps, universities, coaches",
    ],
    cta: "Talk to sales",
  },
];

const cadences = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly · save 20%" },
] as const;

type PricingProps = {
  variant?: "landing" | "dashboard";
  showHeader?: boolean;
  /** When set, marks this plan as "Current" and disables its CTA */
  currentPlan?: AppPlan;
};

export const Pricing = ({ variant = "landing", showHeader = true, currentPlan }: PricingProps) => {
  const [cadence, setCadence] = useState<(typeof cadences)[number]["id"]>("monthly");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [livePlan, setLivePlan] = useState<AppPlan | undefined>(currentPlan);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // On the landing page we don't get currentPlan from props — fetch it for signed-in users.
  useEffect(() => {
    if (currentPlan) {
      setLivePlan(currentPlan);
      return;
    }
    if (!user) {
      setLivePlan(undefined);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLivePlan(((data?.plan as AppPlan) ?? "free"));
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, currentPlan]);

  const effectiveCurrent = livePlan;

  const handlePlanClick = async (planId: string) => {
    if (planId === effectiveCurrent) return;
    if (planId === "teams") {
      window.location.href = "mailto:sales@hirely.app?subject=Teams%20plan%20inquiry";
      return;
    }
    if (!user) {
      try {
        localStorage.setItem("pending_plan", planId);
      } catch {
        /* ignore */
      }
      navigate("/auth?mode=signup");
      return;
    }
    setBusyId(planId);
    const { error } = await supabase
      .from("profiles")
      .update({ plan: planId as AppPlan })
      .eq("user_id", user.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Couldn't switch plan", description: error.message, variant: "destructive" });
      return;
    }
    setLivePlan(planId as AppPlan);
    toast({
      title: planId === "free" ? "Switched to Free" : `You're now on ${planId[0].toUpperCase()}${planId.slice(1)}`,
      description: "Your new limits are active immediately.",
    });
    navigate("/app/resume");
  };


  const wrapperClass =
    variant === "landing"
      ? "px-4 py-28 md:py-32"
      : "py-2";

  return (
    <section id="pricing" className={wrapperClass}>
      <div className="mx-auto max-w-7xl">
        {showHeader && (
          <SectionHeader
            eyebrow="Pricing"
            title="Pick the plan that lands the offer."
            description="Start free. Upgrade when you're ready to ship applications at the speed of intent."
          />
        )}

        {/* Glass cadence toggle */}
        <Reveal>
          <div className="flex justify-center mb-10">
            <div className="glass rounded-full p-1 inline-flex">
              {cadences.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCadence(c.id)}
                  className={cn(
                    "px-5 py-2 rounded-full text-[13px] tracking-tight transition-all",
                    cadence === c.id
                      ? "bg-foreground text-background shadow-sm"
                      : "text-foreground/60 hover:text-foreground",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-stretch">
          {plans.map((plan, idx) => {
            const Icon = plan.icon;
            const yearlyPrice =
              plan.id === "free"
                ? plan.price
                : plan.price.replace(/\$(\d+)/, (_, n) =>
                    `$${Math.round(parseInt(n, 10) * 0.8)}`,
                  );
            const displayPrice = cadence === "yearly" ? yearlyPrice : plan.price;
            const dark = plan.tone === "dark";

            return (
              <Reveal key={plan.id} delay={idx * 80}>
                <div
                  className={cn(
                    "relative h-full rounded-[26px] p-7 flex flex-col transition-transform duration-500 hover:-translate-y-1",
                    dark
                      ? "text-foreground glass-strong ring-1 ring-[hsl(260_60%_55%/0.35)] shadow-[0_30px_70px_-25px_hsl(260_60%_30%/0.35)] [background:linear-gradient(160deg,hsl(var(--soft-lilac)/0.85),hsl(var(--ethereal-blue)/0.65))]"
                      : "glass-strong",
                    plan.highlight && "lg:scale-[1.02] lg:-translate-y-1",
                  )}
                >
                  {plan.badge && (
                    <span
                      className={cn(
                        "absolute -top-3 left-1/2 -translate-x-1/2 text-[10.5px] tracking-[0.18em] uppercase font-semibold px-3 py-1 rounded-full",
                        "bg-foreground text-background shadow-md",
                      )}
                    >
                      {plan.badge}
                    </span>
                  )}

                  <div className="flex items-center gap-2.5 mb-4">
                    <span
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center",
                        dark ? "bg-foreground/10" : "bg-foreground/5",
                      )}
                    >
                      <Icon className="w-4 h-4 text-foreground/75" />
                    </span>
                    <h3 className="font-display text-[19px] font-semibold tracking-tight">
                      {plan.name}
                    </h3>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-4xl md:text-[42px] font-semibold tracking-tight">
                      {displayPrice}
                    </span>
                    {plan.cadence && (
                      <span className="text-sm text-foreground/50">
                        {cadence === "yearly" ? "/mo · billed yearly" : plan.cadence}
                      </span>
                    )}
                  </div>
                  {plan.was && (
                    <p className="mt-1 text-[12px] italic text-foreground/45">
                      {plan.was}
                    </p>
                  )}
                  <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/65">
                    {plan.tagline}
                  </p>

                  <div className="my-5 h-px w-full bg-foreground/10" />

                  <ul className="flex flex-col gap-2.5 mb-7">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13.5px] leading-snug">
                        <Check className="w-4 h-4 mt-0.5 shrink-0 text-foreground/75" />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    disabled={plan.id === effectiveCurrent || busyId === plan.id}
                    onClick={() => handlePlanClick(plan.id)}
                    className={cn(
                      "mt-auto w-full inline-flex items-center justify-center gap-2 rounded-full text-[13.5px] font-medium px-5 py-3 transition-all",
                      plan.id === effectiveCurrent
                        ? "bg-foreground/[0.06] text-foreground/45 cursor-not-allowed"
                        : plan.highlight
                          ? "bg-foreground text-background hover:opacity-90"
                          : "glass hover:bg-foreground hover:text-background",
                      busyId === plan.id && "opacity-60 cursor-wait",
                    )}
                  >
                    {plan.id === effectiveCurrent
                      ? "Current plan"
                      : busyId === plan.id
                        ? "Switching…"
                        : plan.cta}
                  </button>


                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="text-center text-xs text-foreground/45 mt-8">
          All plans include secure data, instant cancellation, and 14-day refund.
        </p>
      </div>
    </section>
  );
};
