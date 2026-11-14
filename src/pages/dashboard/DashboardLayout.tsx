import { useState } from "react";
import { useLocation, Outlet, Navigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "@/components/landing/Logo";
import { DashboardSidebar, MobileSidebar } from "@/components/dashboard/Sidebar";
import { BetaOfferProvider } from "@/components/billing/BetaOffer";
import { UsageMeterStrip } from "@/components/dashboard/UsageMeterStrip";

const DashboardLayout = () => {
  const { pathname } = useLocation();
  const pageSize = pathname === "/app/home" ? "workspace-page--overview"
    : pathname === "/app/resume-builder" ? "workspace-page--catalog"
    : pathname === "/app/profile" ? "workspace-page--profile"
    : ["/app/master-resume", "/app/cover-letter", "/app/interview-prep", "/app/upgrade", "/app/documents"].includes(pathname) ? "workspace-page--reading" : "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading, recovering } = useAuth();
  const workspace = useWorkspace();
  if (loading || (user && workspace.isPending)) return <main className="min-h-screen bg-background flex items-center justify-center" role="status">Loading workspace…</main>;
  if (!user) return <Navigate to={`/auth?next=${encodeURIComponent(pathname)}`} replace />;
  if (recovering) return <Navigate to="/reset-password" replace />;
  if (workspace.error) return <main className="min-h-screen flex flex-col gap-4 items-center justify-center"><p role="alert">Couldn't load your workspace.</p><Button onClick={() => workspace.refetch()}>Retry</Button></main>;

  return (
    <BetaOfferProvider>
    <div className="workspace-shell relative min-h-screen bg-background font-sans">
      <div className="relative flex min-h-screen">
        <div className="hidden md:block shrink-0 animate-sidebar-enter motion-reduce:animate-none">
          <DashboardSidebar />
        </div>

        <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

        <main className="flex-1 min-w-0 px-4 sm:px-6 md:px-8 lg:px-10 py-4 md:py-5 bg-background">
          {/* Mobile top bar with hamburger */}
          <div className="workspace-topbar md:hidden flex items-center gap-3 mb-5">
            <Button variant="outline" size="icon"
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="w-9 h-9 bg-card border-border"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <LogoLockup size="text-lg" />
            <UsageMeterStrip className="ml-auto" />
          </div>

          {/* key on pathname re-runs the enter animation on every nav within /app */}
          <div key={pathname} className={`workspace-page ${pageSize} animate-fade-in motion-reduce:animate-none`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    </BetaOfferProvider>
  );
};

export default DashboardLayout;
