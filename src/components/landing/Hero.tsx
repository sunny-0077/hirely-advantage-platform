import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CareerPreview } from "./CareerPreview";

export const Hero = () => <section className="pt-16 md:pt-20 pb-14 md:pb-20">
  <div className="landing-container">
    <div className="max-w-3xl mx-auto text-center">
      <p className="text-xs font-semibold text-primary mb-5">A more intentional job search</p>
      <h1 className="text-[42px] md:text-[64px] font-semibold leading-[1.12] text-balance">Hirely. Your next move,<br className="hidden sm:block" /> thoughtfully prepared.</h1>
      <p className="mx-auto max-w-xl mt-6 text-base md:text-lg leading-relaxed text-muted-foreground">Find relevant roles. Shape your application around your real experience. Walk into interviews with a clearer plan.</p>
      <Button asChild size="lg" className="mt-7"><Link to="/app">Start your workspace<ArrowRight /></Link></Button>
      <p className="mt-3 text-xs text-muted-foreground">5 free starter credits · No credit card required</p>
    </div>
    <div className="mt-12 md:mt-14"><CareerPreview /></div>
  </div>
</section>;
