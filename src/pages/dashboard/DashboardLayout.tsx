import { useState } from "react";
import { useLocation, Outlet, Navigate } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogoLockup } from "@/components/landing/Logo";
import { DashboardSidebar, MobileSidebar } from "@/components/dashboard/Sidebar";
import { BetaOfferProvider } from "@/components/billing/BetaOffer";
import { UsageMeterStrip } from "@/components/dashboard/UsageMeterStrip";

const DashboardLayout = () => {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const queryClient = useQueryClient();
  const { user, loading, recovering } = useAuth();
  const workspace = useWorkspace();
  if (loading || (user && workspace.isPending)) return <main className="min-h-screen bg-background flex items-center justify-center" role="status">Loading workspace…</main>;
  if (!user) return <Navigate to={`/auth?next=${encodeURIComponent(pathname)}`} replace />;
  if (recovering) return <Navigate to="/reset-password" replace />;
  if (workspace.error) return <main className="min-h-screen flex flex-col gap-4 items-center justify-center"><p role="alert">Couldn't load your workspace.</p><Button onClick={() => workspace.refetch()}>Retry</Button></main>;
  if (!workspace.data?.onboarding_completed) return <Navigate to="/onboarding" replace />;

  return (
    <BetaOfferProvider>
    <div className="workspace-shell relative min-h-screen bg-background font-sans">
      <div className="relative flex min-h-screen">
        <div className="animate-sidebar-enter motion-reduce:animate-none">
          <DashboardSidebar />
        </div>

        <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

        <main className="flex-1 min-w-0 px-4 md:px-6 lg:px-8 py-5 md:py-7 bg-background">
          {/* Mobile top bar with hamburger */}
          <div className="md:hidden flex items-center gap-3 mb-5">
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

          {/* Desktop usage strip — top-right of main pane */}
          <div className="flex justify-end items-center gap-3 mb-7 pb-4 border-b border-border">
            <div className="hidden md:block"><UsageMeterStrip /></div>
            <Button variant="ghost" size="sm" disabled={signingOut} onClick={async () => {
              setSigningOut(true);
              try { const { error } = await supabase.auth.signOut(); if (error) toast.error("Couldn't sign out. Please try again."); else queryClient.clear(); }
              catch { toast.error("Couldn't sign out. Please try again."); }
              finally { setSigningOut(false); }
            }}><LogOut />{signingOut ? "Signing out…" : "Sign out"}</Button>
          </div>

          {/* key on pathname re-runs the enter animation on every nav within /app */}
          <div key={pathname} className="animate-fade-in motion-reduce:animate-none">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    </BetaOfferProvider>
  );
};

export default DashboardLayout;
