import { ArrowUpRight, FileUser, Briefcase, FileText, Mail, MessageSquare, ClipboardList } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { AppTransitionLink } from "@/components/AppTransitionLink";
const capabilities = [
  { icon: FileUser, number: "01", name: "Your career foundation", desc: "Keep experience, skills and achievements in a Master Resume that your application tools can draw from." },
  { icon: Briefcase, number: "02", name: "A more focused job search", desc: "Browse city-routed jobs and review extracted requirements, salary estimates and potential red flags." },
  { icon: FileText, number: "03", name: "Applications with intention", desc: "Tailor your resume to the role, with qualitative keyword insights and your actual career facts." },
  { icon: Mail, number: "04", name: "A more personal introduction", desc: "Draft a cover letter around your experience and the opportunity. Review, copy or export when ready." },
  { icon: MessageSquare, number: "05", name: "Preparation with purpose", desc: "Get role-specific questions, talking points and answer structures before your next interview." },
  { icon: ClipboardList, number: "06", name: "Progress, in one place", desc: "Keep documents, application stages and notes together, from preparation to your next conversation." },
];
const Index = () => <main className="min-h-screen overflow-x-hidden"><Navbar /><Hero /><section id="features" className="landing-container py-16 md:py-24"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div className="max-w-xl"><p className="section-kicker">ONE CONNECTED WORKSPACE</p><h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">More than a better resume.<br />A better way to move forward.</h2></div><Button asChild variant="link" className="justify-start px-0"><AppTransitionLink to="/app">Explore Hirely<ArrowUpRight /></AppTransitionLink></Button></div><div className="mt-12 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">{capabilities.map(c => <article key={c.number} className="border-t border-border py-8"><div className="flex items-center justify-between"><c.icon className="size-5 text-primary" strokeWidth={1.6} /><span className="text-xs text-muted-foreground">{c.number}</span></div><h3 className="mt-6 text-lg font-semibold">{c.name}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{c.desc}</p></article>)}</div></section><HowItWorks /><Pricing /><FinalCTA /><Footer /></main>;
export default Index;
