import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CareerPreview } from "./CareerPreview";

export const Hero = () => <section className="pt-10 md:pt-14 pb-12 md:pb-16">
  <div className="landing-container">
    <div className="max-w-3xl mx-auto text-center">
      <p className="inline-flex bg-accent rounded-md px-3 py-1.5 text-xs font-bold text-accent-foreground mb-5">Your career. Your next move.</p>
      <h1 className="text-[42px] md:text-[64px] font-extrabold leading-[1.08] text-balance">Hirely AI.<br />Your job search, connected.</h1>
      <p className="mx-auto max-w-xl mt-6 text-base md:text-lg leading-relaxed text-muted-foreground">Find relevant roles. Shape your application around your real experience. Walk into interviews with a clearer plan.</p>
      <Button asChild size="lg" className="mt-7"><Link to="/app">Start your workspace<ArrowRight /></Link></Button>
      <p className="mt-3 text-xs text-muted-foreground">5 free starter credits · No credit card required</p>
    </div>
    <div className="mt-9 md:mt-10"><CareerPreview /></div>
  </div>
</section>;
