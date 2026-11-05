import { Check, Compass, Rocket, CalendarRange } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type Tier = {
  id: "scout_free" | "starter_pack" | "pass_90_day";
  name: string;
  price: string;
  note: string;
  icon: typeof Compass;
  features: string[];
  cta: string;
  highlight?: boolean;
};

export const TIERS: Tier[] = [
  { id: "scout_free", name: "Scout", price: "₹0", note: "Free", icon: Compass, cta: "Start free",
    features: ["5 starter credits", "Test Resume Tailoring, Cover Letters and Interview Prep", "City-routed job feed with truth cards"] },
  { id: "starter_pack", name: "Starter Pack", price: "₹249", note: "One-time · no expiry", icon: Rocket, cta: "Get Starter Pack",
    features: ["25 credits", "One-time credit pack", "Credits never expire"] },
  { id: "pass_90_day", name: "90-Day Pass", price: "₹899", note: "90 days", icon: CalendarRange, cta: "Get 90-Day Pass", highlight: true,
    features: ["150 total credits", "50 credits/month across 3 monthly tranches", "Unused credits roll over"] },
];

export const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const choose = (id: Tier["id"]) => {
    const target = id === "scout_free" ? "/app/home" : `/app/upgrade?plan=${id}`;
    if (user) navigate(target);
    else navigate(`/auth?mode=signup&next=${encodeURIComponent(target)}`);
  };

  return (
    <section id="pricing" className="px-4 py-28 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeader eyebrow="Pricing" title="Simple credits. No subscriptions." description="Every tailored resume, cover letter or interview prep guide costs 1 credit." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {TIERS.map((t, idx) => (
            <Reveal key={t.id} delay={idx * 80}>
              <div className={cn("relative h-full rounded-[26px] p-7 flex flex-col glass-strong transition-transform duration-500 hover:-translate-y-1", t.highlight && "ring-2 ring-primary")}>
                {t.highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10.5px] tracking-[0.18em] uppercase font-semibold px-3 py-1 rounded-full bg-foreground text-background">Best value</span>}
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-foreground/5"><t.icon className="w-4 h-4 text-foreground/75" /></span>
                  <h3 className="font-display text-[19px] font-semibold tracking-tight">{t.name}</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl md:text-[42px] font-semibold tracking-tight">{t.price}</span>
                  <span className="text-sm text-foreground/55">{t.note}</span>
                </div>
                <ul className="mt-6 space-y-3 flex-1">
                  {t.features.map(f => <li key={f} className="flex gap-2.5 text-[14px] text-foreground/75"><Check className="w-4 h-4 mt-0.5 text-success shrink-0" />{f}</li>)}
                </ul>
                <button type="button" onClick={() => choose(t.id)}
                  className={cn("mt-8 w-full rounded-full py-3 text-[14px] font-medium transition-opacity hover:opacity-90", t.id === "scout_free" ? "border border-foreground/15 text-foreground" : "bg-foreground text-background")}>
                  {t.cta}
                </button>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="text-center text-[13px] text-foreground/55 mt-8">Private beta: paid plans open soon — join the waitlist and get 5 free bonus credits.</p>
      </div>
    </section>
  );
};
