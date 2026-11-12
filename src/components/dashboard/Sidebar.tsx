import { Button } from "@/components/ui/button";
import { NavLink, useNavigate } from "react-router-dom";
import { Mail, Mic, Briefcase, Send, Bookmark, X, LayoutDashboard, FolderOpen, UserRound, ClipboardList, ShieldCheck, FileUser, LogOut } from "lucide-react";
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

const suite = [
  { to: "/app/cover-letter", label: "Cover Letter Generator", icon: Mail },
  { to: "/app/interview-prep", label: "Interview Prep", icon: Mic },
];

const tracking = [
  { to: "/app/outreach", label: "Outreach", icon: Send },
  { to: "/app/saved", label: "Saved", icon: Bookmark },
];

const SectionLabel = ({ children }: { children: React.ReactNode }) => <p className="text-[10px] uppercase text-muted-foreground px-3 mb-1 font-semibold">{children}</p>;
const SidebarBody = ({ onNavigate }: { onNavigate?: () => void }) => {
 const isAdmin = useIsAdmin();
 const workspaceLinks = [{to:"/app/home",label:"My workspace",icon:LayoutDashboard},{to:"/app/master-resume",label:"Master Resume",icon:FileUser},{to:"/app/jobs",label:"Jobs",icon:Briefcase},{to:"/app/documents",label:"My documents",icon:FolderOpen},{to:"/app/applications",label:"Applications",icon:ClipboardList},{to:"/app/profile",label:"My profile",icon:UserRound}];
 const group=(items:typeof workspaceLinks,soon=false)=><nav className="flex flex-col gap-0.5 mb-3">{items.map(({to,label,icon:Icon})=><NavLink key={to} to={to} onClick={onNavigate} className={({isActive})=>cn("flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] leading-5 transition-colors",isActive?"bg-accent text-primary font-semibold":"text-muted-foreground hover:text-foreground hover:bg-muted")}><Icon className="size-4 shrink-0" strokeWidth={1.8} /><span className="flex-1">{label}</span>{soon&&<span className="text-[9px] uppercase text-muted-foreground">Soon</span>}</NavLink>)}</nav>;
 return <><div className="px-3 pt-1 mb-5"><LogoLockup size="text-2xl" /></div><SectionLabel>Workspace</SectionLabel>{group(workspaceLinks)}<SectionLabel>Suite</SectionLabel>{group(suite)}<SectionLabel>Tracking</SectionLabel>{group(tracking,true)}<div className="border-t border-border pt-2 mb-3"><PlatformFeedbackButton />{isAdmin&&<NavLink to="/app/admin/feedback" onClick={onNavigate} className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-muted-foreground"><ShieldCheck className="size-4" />Admin Feedback</NavLink>}</div><UpgradeCard onNavigate={onNavigate} /><SidebarSignOut /></>;
};

const SidebarSignOut = () => {
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  return <Button variant="ghost" size="sm" className="mt-3 justify-start gap-2.5 px-3 text-[13px] text-muted-foreground" disabled={busy} onClick={async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) toast.error("Couldn't sign out. Please try again.");
      else queryClient.clear();
    } catch { toast.error("Couldn't sign out. Please try again."); }
    finally { setBusy(false); }
  }}><LogOut className="size-4" />{busy ? "Signing out…" : "Sign out"}</Button>;
};

const UpgradeCard = ({ onNavigate }: { onNavigate?: () => void }) => {
  const navigate = useNavigate();
  const { open } = useBetaOffer();
  const workspace = useWorkspace();
  const credits = (workspace.data as { credits_balance?: number } | null | undefined)?.credits_balance;
  return (
    <div className="border-t border-border pt-3 px-3 text-foreground">
      <p className="text-sm font-semibold">{credits != null ? `${credits} credits left` : "Credits"}</p>
      <p className="text-[11px] text-muted-foreground mt-1">Starter Pack ₹249 · 90-Day Pass ₹899</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => open()} className="text-xs flex-1">Get Credits</Button>
        <Button variant="outline" size="sm" onClick={() => { onNavigate?.(); navigate("/app/upgrade"); }} className="text-xs">Plans</Button>
      </div>
    </div>
  );
};

export const DashboardSidebar = () => {
  return (
    <aside className="w-[236px] shrink-0 hidden md:flex flex-col px-4 py-4 bg-card border-r border-border sticky top-0 h-screen overflow-y-auto">
      <SidebarBody />
    </aside>
  );
};

export const MobileSidebar = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
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
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute left-0 top-0 h-full w-[260px] bg-card",
          "border-r border-border shadow-product",
          "flex flex-col px-4 py-4 overflow-y-auto",
          "transition-transform duration-200 will-change-transform",
          open ? "translate-x-0" : "-translate-x-full",
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
      </div>
    </div>
  );
};
