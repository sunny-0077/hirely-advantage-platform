import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gift, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type BetaPlan = "starter_pack" | "pass_90_day";
export const BETA_PLANS: { id: BetaPlan; name: string; price: string; blurb: string }[] = [
  { id: "starter_pack", name: "Starter Pack", price: "₹249", blurb: "One-time credit pack" },
  { id: "pass_90_day", name: "90-Day Pass", price: "₹899", blurb: "50 credits every 30 days · 150 total" },
];

const Ctx = createContext<{ open: (plan?: BetaPlan) => void }>({ open: () => {} });
export const useBetaOffer = () => useContext(Ctx);

export function BetaOfferProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [isOpen, setOpen] = useState(false);
  const [plan, setPlan] = useState<BetaPlan>("starter_pack");
  const [busy, setBusy] = useState(false);
  const open = useCallback((p?: BetaPlan) => { setPlan(p ?? "starter_pack"); setOpen(true); }, []);

  async function claim() {
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_beta_offer", { _plan: plan });
    setBusy(false);
    if (error) { toast.error("Couldn't join the waitlist. Please try again."); return; }
    const r = data as { granted?: boolean; balance?: number } | null;
    toast.success(r?.granted ? `+5 credits added! You now have ${r.balance} credits.` : "You're on the waitlist. (The +5 beta bonus was already claimed on this account.)");
    qc.invalidateQueries();
    setOpen(false);
  }

  return <Ctx.Provider value={{ open }}>
    {children}
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Gift className="size-5 text-primary" />Private Beta Early Access</DialogTitle>
          <DialogDescription>Payments open soon. Pick the plan you'd buy and we'll save your spot — plus you get 5 free credits now (once per account).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3" role="radiogroup" aria-label="Plan">
          {BETA_PLANS.map(p => <button key={p.id} type="button" role="radio" aria-checked={plan === p.id} onClick={() => setPlan(p.id)}
            className={cn("text-left rounded-lg border p-4 transition-colors", plan === p.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50")}>
            <div className="flex justify-between font-semibold"><span>{p.name}</span><span>{p.price}</span></div>
            <p className="text-sm text-muted-foreground">{p.blurb}</p>
          </button>)}
        </div>
        <Button className="w-full" disabled={busy} onClick={claim}>{busy ? <Loader2 className="animate-spin" /> : <Gift />}Claim +5 Free Beta Credits & Join Plan Waitlist</Button>
      </DialogContent>
    </Dialog>
  </Ctx.Provider>;
}
