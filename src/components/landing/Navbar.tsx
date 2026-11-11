import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { LogoLockup } from "./Logo";
import { Button } from "@/components/ui/button";
const links = [{label:"Product",href:"#features"},{label:"How it works",href:"#how-it-works"},{label:"Pricing",href:"#pricing"}];
export const Navbar = () => {
 const [open,setOpen]=useState(false);
 return <header className="sticky top-0 z-50 bg-card border-b border-border"><nav className="landing-container h-[76px] flex items-center justify-between gap-4" aria-label="Main navigation">
 <Link to="/" aria-label="Hirely home"><LogoLockup size="text-2xl" /></Link>
 <div className="hidden md:flex items-center gap-8">{links.map(l=><a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</a>)}</div>
 <div className="flex items-center gap-2"><Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/auth">Sign in</Link></Button><Button asChild size="sm"><Link to="/app">Get started</Link></Button><Button className="md:hidden" size="icon" variant="ghost" aria-label={open?"Close navigation":"Open navigation"} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X />:<Menu />}</Button></div>
 </nav>{open&&<nav className="md:hidden border-t border-border px-6 py-4 flex flex-col gap-4">{links.map(l=><a key={l.href} href={l.href} onClick={()=>setOpen(false)} className="text-sm">{l.label}</a>)}<Link to="/auth">Sign in</Link></nav>}</header>;
};
