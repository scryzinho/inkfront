import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Ticket, 
  Zap, 
  Shield, 
  Gift, 
  Cloud, 
  TrendingUp, 
  Palette,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Users,
  Store,
  Sparkles,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockBotStatus } from "@/lib/mock-data";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const sidebarItems = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard, route: "/dashboard" },
  { id: "store", label: "Loja", icon: ShoppingBag, route: "/dashboard/store" },
  { id: "tickets", label: "Tickets", icon: Ticket, route: "/dashboard/tickets" },
  { id: "automations", label: "Automações", icon: Zap, route: "/dashboard/automations" },
  { id: "protection", label: "Proteção", icon: Shield, route: "/dashboard/protection" },
  { id: "giveaways", label: "Sorteios", icon: Gift, route: "/dashboard/giveaways" },
  { id: "cloud", label: "inkCloud", icon: Cloud, route: "/dashboard/cloud" },
  { id: "earnings", label: "Rendimentos", icon: TrendingUp, route: "/dashboard/earnings" },
  { id: "appearance", label: "Aparência & Config", icon: Palette, route: "/dashboard/appearance" },
];

const comingSoonItems = [
  { id: "affiliates", label: "Afiliados", icon: Users },
  { id: "market", label: "inK Market", icon: Store },
  { id: "extensions", label: "Extensões", icon: Sparkles },
];

export function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();

  const isActive = (route: string) => {
    if (route === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(route);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-white/5",
        collapsed && "justify-center px-2"
      )}>
        {!collapsed && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg font-semibold tracking-tight"
          >
            inkCloud
          </motion.span>
        )}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition-colors ml-auto"
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button
          onClick={onClose}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition-colors ml-auto"
          aria-label="Fechar menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {sidebarItems.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.route}
                onClick={() => window.innerWidth < 1024 && onClose()}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                  "hover:bg-white/[0.06]",
                  isActive(item.route) 
                    ? "bg-white/[0.08] text-foreground" 
                    : "text-muted-foreground hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
                aria-current={isActive(item.route) ? "page" : undefined}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive(item.route) && "text-foreground")} />
                {!collapsed && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Coming Soon */}
        {!collapsed && (
          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Em breve
            </p>
            <ul className="space-y-1">
              {comingSoonItems.map((item) => (
                <li key={item.id}>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground/50 cursor-not-allowed">
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">
                      SOON
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className={cn(
        "border-t border-white/5 p-4",
        collapsed && "p-2"
      )}>
        {/* Bot Status */}
        <div className={cn(
          "flex items-center gap-3 mb-3",
          collapsed && "justify-center"
        )}>
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            mockBotStatus.online ? "bg-success" : "bg-destructive"
          )} />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {mockBotStatus.online ? "Online" : "Offline"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                v{mockBotStatus.version}
              </p>
            </div>
          )}
        </div>

        {/* Support Button */}
        {!collapsed && (
          <button
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            onClick={() => {
              // TODO: Open support modal or redirect
              console.log("Open support");
            }}
          >
            <HelpCircle className="w-4 h-4" />
            Suporte
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40",
          "bg-background/80 backdrop-blur-xl border-r border-white/5",
          "transition-all duration-300 ease-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 h-screen w-72 z-50 lg:hidden bg-background/95 backdrop-blur-xl border-r border-white/5"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
