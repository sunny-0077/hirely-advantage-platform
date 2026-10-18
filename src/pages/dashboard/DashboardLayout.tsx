import { useState } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { MeshGradient } from "@/components/landing/MeshGradient";
import { DashboardSidebar, MobileSidebar } from "@/components/dashboard/Sidebar";
import { UsageMeterStrip } from "@/components/dashboard/UsageMeterStrip";

const DashboardLayout = () => {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="w-9 h-9 rounded-xl bg-card/70 backdrop-blur border border-border/60 flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-card transition-colors shadow-sm"
            >
              <Menu className="w-4 h-4" />
            </button>
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
          <div className="hidden md:flex justify-end mb-3">
            <UsageMeterStrip />
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
