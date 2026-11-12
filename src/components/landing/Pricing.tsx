import { Button } from "@/components/ui/button";
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
    <section id="pricing" className="border-y border-border bg-card py-12 md:py-16">
      <div className="landing-container">
        <SectionHeader eyebrow="Pricing" title="Simple credits. No subscriptions." description="Every tailored resume, cover letter or interview prep guide costs 1 credit." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {TIERS.map((t, idx) => (
            <Reveal key={t.id} delay={idx * 80}>
              <div className={cn("relative h-full rounded-lg p-6 flex flex-col border border-border bg-card", t.highlight && "border-primary")}>
                {t.highlight && <span className="absolute top-6 right-6 text-xs font-medium px-2 py-1 rounded bg-accent text-primary">Best value</span>}
                <div className="flex items-center gap-2.5 mb-4">
                  
                  <h3 className="font-display text-[19px] font-semibold tracking-tight">{t.name}</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl md:text-[42px] font-semibold tracking-tight">{t.price}</span>
                  <span className="text-sm text-muted-foreground">{t.note}</span>
                </div>
                <ul className="mt-6 space-y-3 flex-1">
                  {t.features.map(f => <li key={f} className="flex gap-2.5 text-[14px] text-muted-foreground"><Check className="w-4 h-4 mt-0.5 text-primary shrink-0" />{f}</li>)}
                </ul>
                <Button type="button" onClick={() => choose(t.id)} variant={t.highlight ? "default" : "outline"} className="mt-8 w-full">
                  {t.cta}
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="text-center text-[13px] text-muted-foreground mt-8">Private beta: paid plans open soon — join the waitlist and get 5 free bonus credits.</p>
      </div>
    </section>
  );
};
