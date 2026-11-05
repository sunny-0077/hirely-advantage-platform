import { Check } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { BETA_PLANS, useBetaOffer } from "@/components/billing/BetaOffer";

const FEATURES: Record<string, string[]> = {
  starter_pack: ["Credits for tailoring, cover letters and interview prep", "Use them anytime"],
  pass_90_day: ["50 credits released every 30 days", "150 credits over 90 days", "Unused credits carry over"],
};

const Upgrade = () => {
  const { open } = useBetaOffer();
  return <div className="max-w-4xl mx-auto pb-20">
    <PageHeader eyebrow="Upgrade" title="Get more credits." description="Payments open soon — join the waitlist and get 5 free beta credits today." />
    <div className="grid md:grid-cols-2 gap-5">
      {BETA_PLANS.map(p => <div key={p.id} className="bg-card border border-border rounded-lg p-6 flex flex-col">
        <h2 className="text-lg font-semibold">{p.name}</h2>
        <p className="text-3xl font-semibold my-2">{p.price}</p>
        <p className="text-sm text-muted-foreground mb-4">{p.blurb}</p>
        <ul className="space-y-2 mb-6 flex-1">{FEATURES[p.id].map(f => <li key={f} className="flex gap-2 text-sm"><Check className="size-4 text-success shrink-0 mt-0.5" />{f}</li>)}</ul>
        <Button onClick={() => open(p.id)}>Buy {p.name} · {p.price}</Button>
      </div>)}
    </div>
  </div>;
};

export default Upgrade;
