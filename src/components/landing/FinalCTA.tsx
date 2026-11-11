import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
export const FinalCTA=()=> <section className="py-16 md:py-24"><div className="landing-container flex flex-col md:flex-row md:items-center justify-between gap-8"><div><p className="text-xs font-semibold text-primary mb-4">Your next chapter</p><h2 className="text-3xl md:text-[40px] font-semibold">Give your next move a workspace.</h2><p className="mt-4 text-muted-foreground">Start with your experience. Build from there.</p></div><div className="shrink-0"><Button asChild size="lg"><Link to="/app">Get started free<ArrowRight /></Link></Button><p className="text-xs text-muted-foreground mt-3">5 starter credits. No subscription.</p></div></div></section>;
