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

        <main className="min-w-0 flex-1">
          <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border bg-card px-5 md:px-9">
            <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="md:hidden"><Menu /></Button><div className="md:hidden"><LogoLockup size="text-lg" /></div><span className="hidden text-xs text-muted-foreground md:block">Your career workspace</span></div>
            <div className="flex items-center gap-2"><UsageMeterStrip />
            <Button variant="ghost" size="sm" disabled={signingOut} onClick={async () => {
              setSigningOut(true);
              try { const { error } = await supabase.auth.signOut(); if (error) toast.error("Couldn't sign out. Please try again."); else queryClient.clear(); }
              catch { toast.error("Couldn't sign out. Please try again."); }
              finally { setSigningOut(false); }
            }}><LogOut />{signingOut ? "Signing out…" : "Sign out"}</Button>
            </div>
          </header>

          {/* key on pathname re-runs the enter animation on every nav within /app */}
          <div key={pathname} className="px-5 py-8 md:px-9 md:py-10 animate-dashboard-enter motion-reduce:animate-none">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    </BetaOfferProvider>
  );
};

export default DashboardLayout;
