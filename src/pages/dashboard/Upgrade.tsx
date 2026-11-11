import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { BETA_PLANS, useBetaOffer, type BetaPlan } from "@/components/billing/BetaOffer";

const FEATURES: Record<string, string[]> = {
  starter_pack: ["25 credits", "One-time credit pack", "Credits never expire"],
  pass_90_day: ["150 total credits", "50 credits/month across 3 monthly tranches", "Unused credits roll over"],
};

const Upgrade = () => {
  const { open } = useBetaOffer();
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const p = params.get("plan");
    if (p === "starter_pack" || p === "pass_90_day") { open(p as BetaPlan); setParams({}, { replace: true }); }
  }, [params, open, setParams]);
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
