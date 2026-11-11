import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { LogoLockup } from "./Logo";
import { AppTransitionLink } from "@/components/AppTransitionLink";
import { Button } from "@/components/ui/button";
const links = [{ label: "Product", href: "#features" }, { label: "How it works", href: "#how-it-works" }, { label: "Pricing", href: "#pricing" }];
export const Navbar = () => {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-40 border-b border-border bg-card"><nav className="landing-container flex h-20 items-center justify-between gap-4" aria-label="Main navigation"><a href="#" aria-label="Hirely home"><LogoLockup size="text-2xl" /></a><div className="hidden items-center gap-8 md:flex">{links.map(l => <a key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l.label}</a>)}</div><div className="flex items-center gap-3"><AppTransitionLink to="/auth" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block">Sign in</AppTransitionLink><Button asChild size="sm"><AppTransitionLink to="/app">Get started<ArrowUpRight /></AppTransitionLink></Button><Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button></div></nav>{open && <div className="border-t border-border px-5 py-4 md:hidden">{links.map(l => <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-3 text-sm">{l.label}</a>)}<AppTransitionLink to="/auth" className="block py-3 text-sm">Sign in</AppTransitionLink></div>}</header>;
};
