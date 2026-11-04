import { useState } from "react";
import { useLocation, Outlet, Navigate } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MeshGradient } from "@/components/landing/MeshGradient";
import { DashboardSidebar, MobileSidebar } from "@/components/dashboard/Sidebar";
import { UsageMeterStrip } from "@/components/dashboard/UsageMeterStrip";

const DashboardLayout = () => {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();
  const workspace = useWorkspace();
  if (loading || (user && workspace.isPending)) return <main className="min-h-screen bg-background flex items-center justify-center" role="status">Loading workspace…</main>;
  if (!user) return <Navigate to={`/auth?next=${encodeURIComponent(pathname)}`} replace />;
  if (workspace.error) return <main className="min-h-screen flex flex-col gap-4 items-center justify-center"><p role="alert">Couldn't load your workspace.</p><Button onClick={() => workspace.refetch()}>Retry</Button></main>;
  if (!workspace.data) return <Navigate to="/onboarding" replace />;

  return (
    <div className="relative min-h-screen overflow-x-hidden font-display">
      <MeshGradient />
      <div className="relative flex min-h-screen">
        <div className="animate-sidebar-enter motion-reduce:animate-none">
          <DashboardSidebar />
        </div>

        <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

        <main className="flex-1 px-5 md:px-9 py-7 overflow-hidden">
          {/* Mobile top bar with hamburger */}
          <div className="md:hidden flex items-center gap-3 mb-5">
            <Button variant="outline" size="icon"
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="w-9 h-9 rounded-xl bg-card/70 backdrop-blur border border-border/60 flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-card transition-colors shadow-sm"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center text-background text-[10px] font-semibold">
                H
              </div>
              <span className="font-semibold tracking-[-0.02em] text-foreground text-[13.5px]">
                Hirely
              </span>
            </div>
            <UsageMeterStrip className="ml-auto" />
          </div>

          {/* Desktop usage strip — top-right of main pane */}
          <div className="flex justify-end items-center gap-3 mb-3">
            <div className="hidden md:block"><UsageMeterStrip /></div>
            <Button variant="ghost" size="sm" onClick={async () => { const { error } = await supabase.auth.signOut(); if (error) toast.error(error.message); }}><LogOut />Sign out</Button>
          </div>

          {/* key on pathname re-runs the enter animation on every nav within /app */}
          <div key={pathname} className="animate-dashboard-enter motion-reduce:animate-none">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
