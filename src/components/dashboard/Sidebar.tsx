import { NavLink, useNavigate } from "react-router-dom";
import { Mail, Mic, Briefcase, Send, Bookmark, X, LayoutDashboard, FolderOpen, UserRound, ClipboardList, ShieldCheck, FileUser } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { LogoLockup } from "@/components/landing/Logo";
import { PlatformFeedbackButton } from "@/components/feedback/PlatformFeedbackButton";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useBetaOffer } from "@/components/billing/BetaOffer";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";

const suite = [
  { to: "/app/cover-letter", label: "Cover Letter Generator", icon: Mail },
  { to: "/app/interview-prep", label: "Interview Prep", icon: Mic },
];

const tracking = [
  { to: "/app/outreach", label: "Outreach", icon: Send },
  { to: "/app/saved", label: "Saved", icon: Bookmark },
];

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] uppercase text-muted-foreground px-3 mb-3 font-semibold">
    {children}

  </p>
);

const SidebarBody = ({ onNavigate }: { onNavigate?: () => void }) => {
  const isAdmin = useIsAdmin();
  const workspaceLinks = [{ to: "/app/home", label: "My workspace", icon: LayoutDashboard }, { to: "/app/master-resume", label: "Master Resume", icon: FileUser }, { to: "/app/jobs", label: "Jobs", icon: Briefcase }, { to: "/app/documents", label: "My documents", icon: FolderOpen }, { to: "/app/applications", label: "Applications", icon: ClipboardList }, { to: "/app/profile", label: "My profile", icon: UserRound }];
  return (
  <>
    <div className="flex items-center mb-9 px-3">
      <LogoLockup size="text-xl font-sans" />
    </div>

    <SectionLabel>Workspace</SectionLabel>
    <nav className="flex flex-col gap-1 mb-5">
      {workspaceLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => cn("flex gap-3 items-center rounded-md px-3 py-2.5 text-[13px] transition-colors", isActive ? "bg-accent text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted")}><Icon className="size-4" />{label}</NavLink>)}
    </nav>
    <><SectionLabel>Suite</SectionLabel>
    <nav className="flex flex-col gap-0.5 mb-5">
      {suite.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] transition-colors",
              isActive
                ? "bg-accent text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </>
          )}

        </NavLink>
      ))}
    </nav>

    <SectionLabel>Tracking</SectionLabel>
    <nav className="flex flex-col gap-0.5 mb-5">
      {tracking.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group flex items-center justify-between px-3 py-2 rounded-md text-[13px] transition-colors",
              isActive
                ? "text-primary font-semibold bg-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )
          }
        >
          <span className="flex items-center gap-2.5">
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </span>
          <span className="text-[9px] uppercase text-muted-foreground px-1.5 py-0.5 rounded border border-border">
            Soon
          </span>

        </NavLink>
      ))}
    </nav>

    <PlatformFeedbackButton />
    {isAdmin && (
      <NavLink
        to="/app/admin/feedback"
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "group flex items-center gap-2.5 px-3 py-2 mt-2 rounded-md text-[13px] transition-colors",
            isActive
              ? "text-primary font-semibold bg-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )
        }
      >
        <ShieldCheck className="w-4 h-4 shrink-0" />
        Admin Feedback
      </NavLink>
    )}
    <UpgradeCard onNavigate={onNavigate} /></>
  </>
  );
};

const UpgradeCard = ({ onNavigate }: { onNavigate?: () => void }) => {
  const navigate = useNavigate();
  const { open } = useBetaOffer();
  const workspace = useWorkspace();
  const credits = (workspace.data as { credits_balance?: number } | null | undefined)?.credits_balance;
  return (
    <div className="mt-8 border-t border-border pt-5 px-3">
      <p className="text-sm font-semibold">{credits != null ? `${credits} credits left` : "Credits"}</p>
      <p className="text-[10px] text-muted-foreground mt-1">Starter Pack ₹249 · 90-Day Pass ₹899</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => open()} className="flex-1 text-xs">Get Credits</Button>
        <Button size="sm" variant="outline" onClick={() => { onNavigate?.(); navigate("/app/upgrade"); }} className="text-xs">Plans</Button>
      </div>
    </div>
  );
};

export const DashboardSidebar = () => {
  return (
    <aside className="sticky top-0 h-screen w-[244px] shrink-0 hidden md:flex flex-col overflow-y-auto border-r border-border bg-card px-4 py-7">
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
      <Button
        variant="ghost"
        type="button"
        aria-label="Close sidebar"
        onClick={onClose}
        className={cn(
          "absolute inset-0 h-full w-full rounded-none bg-foreground/30 hover:bg-foreground/30 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute left-0 top-0 h-full w-[260px] bg-card",
          "border-r border-border",
          "flex flex-col px-5 py-7",
          "transition-transform duration-200 overflow-y-auto",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
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
