import { Button } from "@/components/ui/button";
import { NavLink, useNavigate } from "react-router-dom";
import { Mail, Mic, Briefcase, X, FolderOpen, UserRound, ClipboardList, ShieldCheck, FileUser, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogoLockup } from "@/components/landing/Logo";
import { PlatformFeedbackButton } from "@/components/feedback/PlatformFeedbackButton";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useBetaOffer } from "@/components/billing/BetaOffer";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { LucideIcon } from "lucide-react";

const HomeFilled = (({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" {...(props as object)}>
    <path d="M12.707 2.293l9 9c.63 .63 .184 1.707 -.707 1.707h-1v6a3 3 0 0 1 -3 3h-1v-7a3 3 0 0 0 -2.824 -2.995l-.176 -.005h-2a3 3 0 0 0 -3 3v7h-1a3 3 0 0 1 -3 -3v-6h-1c-.89 0 -1.337 -1.077 -.707 -1.707l9 -9a1 1 0 0 1 1.414 0m.293 11.707a1 1 0 0 1 1 1v7h-4v-7a1 1 0 0 1 .883 -.993l.117 -.007z" />
  </svg>
)) as unknown as LucideIcon;

const suite = [
  { to: "/app/cover-letter", label: "Cover Letter Generator", icon: Mail },
  { to: "/app/interview-prep", label: "Interview Prep", icon: Mic },
];

const SectionLabel = ({ children }: { children: React.ReactNode }) => <p className="text-[10px] uppercase text-muted-foreground px-3 mb-[4.2px] font-semibold">{children}</p>;
const SidebarBody = ({ onNavigate, collapsed = false, onToggle }: { onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }) => {
 const isAdmin = useIsAdmin();
 const [hovered, setHovered] = useState<string | null>(null);
 const reducedMotion = useReducedMotion();
 const transition = reducedMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 350, damping: 30 };
 const workspaceLinks = [{to:"/app/home",label:"Dashboard",icon:HomeFilled},{to:"/app/master-resume",label:"Master Resume",icon:FileUser},{to:"/app/jobs",label:"Jobs",icon:Briefcase},...suite];
 const careerLinks = [{to:"/app/documents",label:"My documents",icon:FolderOpen},{to:"/app/applications",label:"Applications",icon:ClipboardList},{to:"/app/profile",label:"My profile",icon:UserRound}];
 const group = (items: typeof workspaceLinks) => <nav className="flex flex-col gap-[2.1px] mb-[12.6px]" onMouseLeave={() => setHovered(null)}>{items.map(({ to, label, icon: Icon }) =>
   <Tooltip key={to}><TooltipTrigger asChild><NavLink to={to} aria-label={label} onClick={onNavigate} onMouseEnter={() => setHovered(to)} onFocus={() => setHovered(to)} onBlur={() => setHovered(null)} className="relative flex items-center gap-2.5 px-3 py-[6.3px] rounded-md text-[13px] leading-5 transition-colors overflow-hidden text-muted-foreground hover:text-foreground [&.active]:text-primary [&.active]:font-semibold">
     {({ isActive }) => <>
       {isActive && <motion.span layoutId="sidebar-selected" transition={transition} className="pointer-events-none absolute inset-0 rounded-md bg-accent" />}
       <AnimatePresence>{hovered === to && !isActive && <motion.span layoutId="sidebar-hover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="pointer-events-none absolute inset-0 rounded-md bg-muted" />}</AnimatePresence>
       <Icon className="relative z-10 size-4 shrink-0" strokeWidth={1.8} />
       <AnimatePresence initial={false}>{!collapsed && <motion.span key="label" initial={{ opacity: 0, filter: reducedMotion ? "none" : "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0, filter: reducedMotion ? "none" : "blur(4px)" }} transition={{ duration: reducedMotion ? 0 : 0.2 }} className="relative z-10 flex-1 whitespace-nowrap">{label}</motion.span>}</AnimatePresence>
     </>}
   </NavLink></TooltipTrigger>{collapsed && <TooltipContent side="right">{label}</TooltipContent>}</Tooltip>
 )}</nav>;
 return <LayoutGroup><div className="flex items-center justify-between pt-1 mb-[21px] min-h-8">
   {!collapsed && <div className="px-3"><LogoLockup size="text-2xl" /></div>}
   {onToggle && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} className="size-8 shrink-0 text-muted-foreground">{collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}</Button></TooltipTrigger><TooltipContent side="right">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent></Tooltip>}
 </div>{!collapsed && <SectionLabel>Workspace</SectionLabel>}{group(workspaceLinks)}{!collapsed && <SectionLabel>My career</SectionLabel>}{group(careerLinks)}
 <AnimatePresence initial={false}>{!collapsed && <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.15 }} className="min-w-[204px]"><div className="border-t border-border pt-[8.4px] mb-[12.6px]"><PlatformFeedbackButton />{isAdmin&&<NavLink to="/app/admin/feedback" onClick={onNavigate} className="flex items-center gap-2.5 px-3 py-[6.3px] text-[13px] text-muted-foreground"><ShieldCheck className="size-4" />Admin Feedback</NavLink>}</div><UpgradeCard onNavigate={onNavigate} /></motion.div>}</AnimatePresence><SidebarSignOut collapsed={collapsed} /></LayoutGroup>;
};

const SidebarSignOut = ({ collapsed = false }: { collapsed?: boolean }) => {
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  return <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" aria-label="Sign out" className="mt-[12.6px] justify-start gap-2.5 px-3 text-[13px] text-muted-foreground" disabled={busy} onClick={async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) toast.error("Couldn't sign out. Please try again.");
      else queryClient.clear();
    } catch { toast.error("Couldn't sign out. Please try again."); }
    finally { setBusy(false); }
  }}><LogOut className="size-4 shrink-0" />{!collapsed && (busy ? "Signing out…" : "Sign out")}</Button></TooltipTrigger>{collapsed && <TooltipContent side="right">Sign out</TooltipContent>}</Tooltip>;
};

const UpgradeCard = ({ onNavigate }: { onNavigate?: () => void }) => {
  const navigate = useNavigate();
  const { open } = useBetaOffer();
  const workspace = useWorkspace();
  const credits = (workspace.data as { credits_balance?: number } | null | undefined)?.credits_balance;
  return (
    <div className="border-t border-border pt-[12.6px] px-3 text-foreground">
      <p className="text-sm font-semibold">{credits != null ? `${credits} credits left` : "Credits"}</p>
      <p className="text-[11px] text-muted-foreground mt-[4.2px]">Starter Pack ₹249 · 90-Day Pass ₹899</p>
      <div className="mt-[12.6px] flex gap-2">
        <Button size="sm" onClick={() => open()} className="text-xs flex-1">Get Credits</Button>
        <Button variant="outline" size="sm" onClick={() => { onNavigate?.(); navigate("/app/upgrade"); }} className="text-xs">Plans</Button>
      </div>
    </div>
  );
};

export const DashboardSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const reducedMotion = useReducedMotion();
  return (
    <motion.aside initial={false} animate={{ width: collapsed ? 72 : 236 }} transition={reducedMotion ? { duration: 0 } : { type: "spring", bounce: 0.15, duration: 0.65 }} className="shrink-0 hidden md:flex flex-col px-4 py-4 bg-card border-r border-border sticky top-0 h-screen overflow-y-auto overflow-x-hidden">
      <SidebarBody collapsed={collapsed} onToggle={() => setCollapsed(value => !value)} />
    </motion.aside>
  );
};

export const MobileSidebar = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "md:hidden fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close sidebar"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-foreground/25 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Drawer */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Workspace menu"
        initial={false}
        animate={{ x: open ? 0 : "-100%" }}
        transition={reducedMotion ? { duration: 0 } : { type: "spring", bounce: 0.15, duration: 0.65 }}
        className={cn(
          "absolute left-0 top-0 h-full w-[260px] bg-card",
          "border-r border-border shadow-product",
          "flex flex-col px-4 py-4 overflow-y-auto",
        )}
      >
        <Button variant="ghost" size="icon"
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-card/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </Button>
        <SidebarBody onNavigate={onClose} />
      </motion.div>
    </div>
  );
};
