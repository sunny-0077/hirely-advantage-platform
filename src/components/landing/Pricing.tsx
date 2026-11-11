import { Check, Compass, Rocket, CalendarRange } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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

  return <section id="pricing" className="landing-container py-16 md:py-24">
    <SectionHeader eyebrow="FLEXIBLE BY DESIGN" title="Your pace. Your plan." description="One credit for a tailored resume, cover letter or interview prep guide. Choose what you need, when you need it." />
    <div className="grid gap-4 md:grid-cols-3">{TIERS.map(t => <div key={t.id} className={cn("relative flex flex-col rounded-lg border bg-card p-6 md:p-8", t.highlight ? "border-primary" : "border-border")}>
      <div className="flex items-center justify-between gap-2"><h3 className="text-lg font-semibold">{t.name}</h3>{t.highlight && <span className="rounded bg-accent px-2 py-1 text-[11px] font-medium text-primary">Best value</span>}</div>
      <p className="mt-6 text-4xl font-semibold">{t.price}</p><p className="mt-2 text-xs text-muted-foreground">{t.note}</p>
      <Button onClick={() => choose(t.id)} variant={t.highlight ? "default" : "outline"} className="mt-7 w-full">{t.cta}</Button>
      <ul className="mt-7 flex-1 space-y-4 border-t border-border pt-6">{t.features.map(f => <li key={f} className="flex gap-2.5 text-sm leading-6 text-muted-foreground"><Check className="mt-1 size-4 shrink-0 text-primary" />{f}</li>)}</ul>
    </div>)}</div>
    <p className="mt-6 text-sm text-muted-foreground">Private beta · Paid plans open soon. Join the waitlist for a one-time 5-credit bonus.</p>
  </section>;
};
