import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, 
  Search, 
  ChevronDown, 
  LogOut, 
  Settings,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockGuilds } from "@/lib/mock-data";
import { fetchMe, logout } from "@/lib/api/auth";
import { fetchBots } from "@/lib/api/bots";
import { useTenant } from "@/lib/tenant";

interface TopbarProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

const REFRESH_INTERVAL_MS = 30_000;

const routeTitles: Record<string, string> = {
  "/dashboard": "Visão Geral",
  "/dashboard/store": "Loja",
  "/dashboard/tickets": "Tickets",
  "/dashboard/automations": "Automações",
  "/dashboard/protection": "Proteção",
  "/dashboard/giveaways": "Sorteios",
  "/dashboard/cloud": "inkCloud",
  "/dashboard/earnings": "Rendimentos",
  "/dashboard/appearance": "Aparência & Configurações",
};

export function Topbar({ onMenuClick, sidebarCollapsed }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenantId, setTenantId } = useTenant();
  const [bots, setBots] = useState<Array<any>>(() => {
    try {
      const cached = window.localStorage.getItem("inkcloud_bots_cache");
      if (!cached) return [];
      return JSON.parse(cached) as Array<any>;
    } catch {
      return [];
    }
  });
  const [isGuildDropdownOpen, setIsGuildDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [user, setUser] = useState<{ username: string; avatar: string | null } | null>(() => {
    try {
      const cached = window.localStorage.getItem("inkcloud_me_cache");
      if (!cached) return null;
      return JSON.parse(cached) as { username: string; avatar: string | null };
    } catch {
      return null;
    }
  });
  const botMenuRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await fetchMe();
      if (!isMountedRef.current) return;
      if (me) {
        const nextUser = { username: me.username, avatar: me.avatar };
        setUser(nextUser);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem("inkcloud_me_cache", JSON.stringify(nextUser));
          } catch {
            // ignore cache write errors
          }
        }
      } else {
        setUser(null);
      }
    } catch {
      if (isMountedRef.current) {
        setUser(null);
      }
    }
  }, []);

  const refreshBots = useCallback(async () => {
    try {
      const data = await fetchBots();
      if (!isMountedRef.current) return;
      setBots(data);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("inkcloud_bots_cache", JSON.stringify(data));
        } catch {
          // ignore cache write errors
        }
      }
      if (data.length === 0) {
        setTenantId(null);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.removeItem("inkcloud_selected_bot");
          } catch {
            // ignore cache errors
          }
        }
        try {
          await logout();
        } catch {
          // ignore logout errors
        }
        if (!isMountedRef.current) return;
        navigate("/login");
        return;
      }
      const hasCurrent = tenantId && data.some((bot) => bot.tenant_id === tenantId);
      if (!hasCurrent) {
        setTenantId(data[0].tenant_id);
      }
    } catch {
      if (isMountedRef.current) {
        setBots([]);
      }
    }
  }, [navigate, setTenantId, tenantId]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    isMountedRef.current = true;
    void refreshUser();
    const interval = window.setInterval(() => {
      void refreshUser();
    }, REFRESH_INTERVAL_MS);
    const onFocus = () => {
      void refreshUser();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      isMountedRef.current = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshUser]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    void refreshBots();
    const interval = window.setInterval(() => {
      void refreshBots();
    }, REFRESH_INTERVAL_MS);
    const onFocus = () => {
      void refreshBots();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshBots]);

  const botOptions = useMemo(() => {
    if (bots.length > 0) {
      return bots.map((bot) => ({
        id: bot.tenant_id,
        name: bot.bot_name || bot.guild_name || `Bot ${bot.tenant_id.slice(0, 6)}`,
        icon:
          bot.bot_avatar ||
          bot.guild_icon ||
          "https://cdn.discordapp.com/embed/avatars/0.png",
        status: bot.bot_status,
      }));
    }
    return mockGuilds.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      status: "pending",
    }));
  }, [bots]);

  const selectedBot = useMemo(() => {
    return botOptions.find((g) => g.id === tenantId) || botOptions[0];
  }, [botOptions, tenantId]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!isGuildDropdownOpen) return;
      const target = event.target as Node;
      if (botMenuRef.current && !botMenuRef.current.contains(target)) {
        setIsGuildDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isGuildDropdownOpen]);

  const currentTitle = routeTitles[location.pathname] || "Dashboard";

  const breadcrumbs = location.pathname
    .split("/")
    .filter(Boolean)
    .map((part, index, arr) => ({
      label: part === "dashboard" ? "Dashboard" : routeTitles[`/dashboard/${part}`] || part,
      path: "/" + arr.slice(0, index + 1).join("/"),
      isLast: index === arr.length - 1,
    }));

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16",
        "bg-background/80 backdrop-blur-xl border-b border-white/5",
        "transition-all duration-300",
        sidebarCollapsed ? "lg:left-16" : "lg:left-64",
        "left-0"
      )}
    >
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="hidden sm:block">
            <ol className="flex items-center gap-1 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <li key={crumb.path} className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  {crumb.isLast ? (
                    <span className="font-medium text-foreground">{crumb.label}</span>
                  ) : (
                    <button
                      onClick={() => navigate(crumb.path)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* Mobile title */}
          <h1 className="sm:hidden text-base font-semibold">{currentTitle}</h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 200 }}
                  exit={{ opacity: 0, width: 0 }}
                  className="absolute right-10 top-1/2 -translate-y-1/2"
                >
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none focus:border-white/20 transition-colors"
                    autoFocus
                    onBlur={() => {
                      if (!searchQuery) setIsSearchOpen(false);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Buscar"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Bot Selector */}
          <div className="relative" ref={botMenuRef}>
            <button
              onClick={() => setIsGuildDropdownOpen(!isGuildDropdownOpen)}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              aria-expanded={isGuildDropdownOpen}
              aria-haspopup="listbox"
            >
              {selectedBot ? (
                <img
                  src={selectedBot.icon}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/10" />
              )}
              <span className="text-sm font-medium max-w-[120px] truncate">
                {selectedBot?.name || "Sem bots"}
              </span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                isGuildDropdownOpen && "rotate-180"
              )} />
            </button>

            <AnimatePresence>
              {isGuildDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-64 p-1 rounded-xl bg-card/95 backdrop-blur-xl border border-white/10 shadow-xl z-50"
                  role="listbox"
                >
                  {botOptions.map((bot) => (
                    <button
                      key={bot.id}
                      onClick={() => {
                        setTenantId(bot.id);
                        setIsGuildDropdownOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors",
                        selectedBot?.id === bot.id
                          ? "bg-white/10"
                          : "hover:bg-white/5"
                      )}
                      role="option"
                      aria-selected={selectedBot?.id === bot.id}
                    >
                      <img
                        src={bot.icon}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{bot.name}</p>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-white/10 my-1" />
                  <button
                    onClick={() => {
                      setIsGuildDropdownOpen(false);
                      navigate("/checkout");
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-left text-sm hover:bg-white/5 transition-colors"
                  >
                    Comprar novo bot
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors overflow-hidden"
              aria-expanded={isProfileDropdownOpen}
              aria-haspopup="menu"
              aria-label="Menu do usuário"
            >
              <img
                src={user?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </button>

            <AnimatePresence>
              {isProfileDropdownOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 p-1 rounded-xl bg-card/95 backdrop-blur-xl border border-white/10 shadow-xl z-50"
                    role="menu"
                  >
                    <div className="px-3 py-2 border-b border-white/5 mb-1">
                      <p className="text-sm font-medium">{user?.username || "Usuário"}</p>
                      <p className="text-xs text-muted-foreground">Plano Premium</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        navigate("/dashboard/appearance");
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left hover:bg-white/5 transition-colors"
                      role="menuitem"
                    >
                      <Settings className="w-4 h-4" />
                      Configurações
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        logout()
                          .catch(() => {})
                          .finally(() => {
                            localStorage.removeItem("inkcloud_subscribed");
                            localStorage.removeItem("inkcloud_setup");
                            navigate("/");
                          });
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left text-destructive hover:bg-destructive/10 transition-colors"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
