import { Button } from "@/components/ui/button";
import { NavLink, useNavigate } from "react-router-dom";
import { Mail, Mic, Briefcase, Send, Bookmark, X, LayoutDashboard, FolderOpen, UserRound, ClipboardList, ShieldCheck, FileUser } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
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

const SectionLabel = ({ children }: { children: React.ReactNode }) => <p className="text-[10px] uppercase text-muted-foreground px-3 mb-2 font-semibold">{children}</p>;
const SidebarBody = ({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) => {
 const isAdmin = useIsAdmin();
 const workspaceLinks = [{to:"/app/home",label:"My workspace",icon:LayoutDashboard},{to:"/app/master-resume",label:"Master Resume",icon:FileUser},{to:"/app/jobs",label:"Jobs",icon:Briefcase},{to:"/app/documents",label:"My documents",icon:FolderOpen},{to:"/app/applications",label:"Applications",icon:ClipboardList},{to:"/app/profile",label:"My profile",icon:UserRound}];
 const group=(items:typeof workspaceLinks,soon=false)=><nav className="flex flex-col gap-1 mb-5">{items.map(({to,label,icon:Icon})=><NavLink key={to} to={to} title={label} aria-label={label} onClick={onNavigate} className={({isActive})=>cn("flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] transition-colors",collapsed&&"justify-center px-2",isActive?"bg-accent text-foreground font-bold":"text-foreground/75 hover:text-foreground hover:bg-muted")}><Icon className={cn("size-[18px] shrink-0",collapsed&&"size-5")} strokeWidth={1.9} />{!collapsed&&<><span className="flex-1">{label}</span>{soon&&<span className="text-[9px] text-muted-foreground">Soon</span>}</>}</NavLink>)}</nav>;
 return <><div className={cn("px-3 pt-1 mb-7",collapsed&&"px-0 [&_.logo-lockup__word]:hidden")}><LogoLockup size="text-2xl" /></div>{!collapsed&&<SectionLabel>Workspace</SectionLabel>}{group(workspaceLinks)}{!collapsed&&<SectionLabel>Suite</SectionLabel>}{group(suite)}{!collapsed&&<SectionLabel>Tracking</SectionLabel>}{group(tracking,true)}{!collapsed&&<><div className="border-t border-border pt-4 mb-5"><PlatformFeedbackButton />{isAdmin&&<NavLink to="/app/admin/feedback" onClick={onNavigate} className="flex items-center gap-3 px-3 py-2.5 text-[13px] text-muted-foreground"><ShieldCheck className="size-4" />Admin Feedback</NavLink>}</div><UpgradeCard onNavigate={onNavigate} /></>}</>;
};

const UpgradeCard = ({ onNavigate }: { onNavigate?: () => void }) => {
  const navigate = useNavigate();
  const { open } = useBetaOffer();
  const workspace = useWorkspace();
  const credits = (workspace.data as { credits_balance?: number } | null | undefined)?.credits_balance;
  return (
    <div className="mt-auto rounded-lg bg-highlight p-3 text-highlight-foreground">
      <p className="text-sm font-semibold">{credits != null ? `${credits} credits left` : "Credits"}</p>
      <p className="text-[10px] text-highlight-muted mt-1">Starter Pack ₹249 · 90-Day Pass ₹899</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => open()} className="text-xs flex-1">Get Credits</Button>
        <Button variant="outline" size="sm" onClick={() => { onNavigate?.(); navigate("/app/upgrade"); }} className="text-xs">Plans</Button>
      </div>
    </div>
  );
};

export const DashboardSidebar = ({ collapsed = false }: { collapsed?: boolean }) => {
  return (
    <aside className={cn("shrink-0 hidden md:flex flex-col px-3 py-5 bg-card border-r border-border sticky top-0 h-screen overflow-y-auto",collapsed ? "w-[68px]" : "w-[212px]")}>
      <SidebarBody collapsed={collapsed} />
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
          "flex flex-col px-4 py-6 overflow-y-auto",
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
