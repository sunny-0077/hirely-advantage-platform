import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
const features = [
 {n:"01", title:"A career foundation that stays yours.", text:"Keep your experience, skills and achievements in one Master Resume. Import a PDF or Word file, review it, and choose what to keep.",label:"Master Resume",to:"/app/master-resume"},
 {n:"02", title:"Look beyond the job description.", text:"Browse roles by city. See extracted technology requirements, estimated compensation and possible red flags before deciding where to apply.",label:"Jobs & truth cards",to:"/app/jobs"},
 {n:"03", title:"Make every application intentional.", text:"Create role-specific resumes and cover letters from your saved career facts. Prepare interview questions and keep your documents together.",label:"Application studio",to:"/app/home"},
 {n:"04", title:"Keep your next steps in view.", text:"Track applications from preparation to outcome, keep personal notes, and return to the documents you created for each role.",label:"Application tracking",to:"/app/applications"},
];
export default function Index(){ return <main className="min-h-screen bg-background"><Navbar /><Hero />
 <section id="features" className="bg-muted border-y border-border py-12 md:py-16"><div className="landing-container">
 <div className="grid md:grid-cols-2 gap-6 md:gap-20 mb-12"><div><p className="text-xs font-semibold text-primary mb-4">Built around your next move</p><h2 className="text-3xl md:text-[40px] font-extrabold leading-tight">One workspace.<br />The whole job search.</h2></div><p className="text-muted-foreground text-base leading-relaxed self-end max-w-md">Not another disconnected document tool. A considered place to discover opportunities, prepare applications and keep moving forward.</p></div>
 <div className="grid md:grid-cols-2 gap-x-16">{features.map(f=><article key={f.n} className="border-t border-border py-8"><span className="text-xs text-muted-foreground">{f.n} / {f.label}</span><h3 className="text-xl font-extrabold mt-4 mb-3">{f.title}</h3><p className="text-sm leading-relaxed text-muted-foreground max-w-md">{f.text}</p><Link to={f.to} className="inline-flex items-center gap-2 text-sm font-semibold mt-5 text-primary">Explore {f.label.toLowerCase()}<ArrowUpRight className="size-4" /></Link></article>)}</div>
 </div></section><HowItWorks /><Pricing /><FinalCTA /><Footer /></main>; }
