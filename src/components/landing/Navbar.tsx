import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LogoLockup } from "./Logo";
import { AppTransitionLink } from "@/components/AppTransitionLink";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-4 left-0 right-0 z-50 px-4 animate-fade-in">
      <nav
        className={cn(
          "mx-auto max-w-6xl flex items-center justify-between rounded-full px-6 py-3 transition-all duration-500",
          scrolled ? "glass-strong" : "glass-subtle"
        )}
      >
        <a href="#" className="group">
          <LogoLockup size="text-xl" />
        </a>

        <ul className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-[14px] font-medium tracking-[-0.005em] text-foreground/65 hover:text-foreground transition-colors"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <AppTransitionLink
          to="/app"
          className="text-[14px] font-medium tracking-[-0.01em] text-background bg-foreground px-5 py-2 rounded-full hover:opacity-90 transition-opacity"
        >
          Get Started
        </AppTransitionLink>
      </nav>
    </header>
  );
};
