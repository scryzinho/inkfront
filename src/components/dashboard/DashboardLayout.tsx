import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "@/lib/utils";
import { fetchMe } from "@/lib/api/auth";
import { TenantProvider, useTenant } from "@/lib/tenant";
import { CustomModeProvider } from "@/lib/custom-mode";

function DashboardLayoutContent() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const { tenantId } = useTenant();

  useEffect(() => {
    let mounted = true;
    fetchMe()
      .then((user) => {
        if (!mounted) return;
        if (!user) {
          navigate("/login");
          return;
        }
        const setup = localStorage.getItem("inkcloud_setup");
        const subscribed = localStorage.getItem("inkcloud_subscribed");
        if (!setup) {
          navigate(subscribed ? "/setup" : "/checkout");
          return;
        }
        setAuthChecked(true);
      })
      .catch(() => {
        if (mounted) {
          navigate("/login");
        }
      });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (!authChecked || !tenantId) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background noise texture */}
      <div 
        className="fixed inset-0 opacity-[0.015] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <Topbar
        onMenuClick={() => setSidebarOpen(true)}
        sidebarCollapsed={sidebarCollapsed}
      />

      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <motion.div
          key={tenantId || "no-tenant"}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="p-4 lg:p-6"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}

export function DashboardLayout() {
  return (
    <TenantProvider>
      <CustomModeProvider>
        <DashboardLayoutContent />
      </CustomModeProvider>
    </TenantProvider>
  );
}
