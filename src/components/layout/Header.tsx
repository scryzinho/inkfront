import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogIn, LogOut } from "lucide-react";
import { GlassButton } from "@/components/ui/GlassButton";
import { fetchMe, logout } from "@/lib/api/auth";

const navLinks = [
  { label: "Recursos", href: "#recursos" },
  { label: "Preços", href: "#precos" },
  { label: "FAQ", href: "#faq" },
];

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  has_selected_guild: boolean;
}

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const location = useLocation();
  const isLanding = location.pathname === "/";

  useEffect(() => {
    let mounted = true;
    fetchMe()
      .then((me) => {
        if (!mounted) return;
        if (me) {
          setUser({
            id: me.discord_user_id,
            username: me.username,
            avatar: me.avatar,
            has_selected_guild: me.has_selected_guild
          });
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (mounted) setUser(null);
      });
    return () => {
      mounted = false;
    };
  }, [location]);

  const handleLogout = () => {
    logout()
      .catch(() => {})
      .finally(() => {
        setUser(null);
        window.location.href = "/";
      });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass border-b border-white/5">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="inkCloud" className="w-10 h-10 object-contain" />
              </div>
              <span className="text-lg font-semibold tracking-tight group-hover:text-white/80 transition-colors">
                inkCloud
              </span>
            </Link>

            {/* Desktop Nav */}
            {isLanding && (
              <nav className="hidden md:flex items-center gap-8">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            )}

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                    <img
                      src={user.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                      alt={user.username}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm font-medium">{user.username}</span>
                  </div>
                  
                  {isLanding ? (
                    <Link to="/checkout">
                      <GlassButton variant="primary" size="sm">
                        Assinar
                      </GlassButton>
                    </Link>
                  ) : user.has_selected_guild ? (
                    <Link to="/dashboard">
                      <GlassButton variant="default" size="sm">
                        Dashboard
                      </GlassButton>
                    </Link>
                  ) : (
                    <Link to="/checkout">
                      <GlassButton variant="default" size="sm">
                        Selecionar servidor
                      </GlassButton>
                    </Link>
                  )}
                  
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                    title="Sair"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login">
                    <GlassButton variant="ghost" size="sm">
                      <LogIn className="w-4 h-4" />
                      Entrar
                    </GlassButton>
                  </Link>
                  {isLanding && (
                    <Link to="/login?redirect=/checkout">
                      <GlassButton variant="primary" size="sm">
                        Assinar
                      </GlassButton>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden glass border-b border-white/5 overflow-hidden"
          >
            <div className="container py-4 space-y-4">
              {/* User info on mobile */}
              {user && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <img
                      src={user.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                      alt={user.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-sm font-medium">{user.username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {isLanding && (
                <nav className="flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
              )}
              
              <div className="pt-2 border-t border-white/5 space-y-2">
                {user ? (
                  <Link
                    to={isLanding ? "/checkout" : "/dashboard"}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <GlassButton variant="primary" className="w-full">
                      {isLanding ? "Assinar" : user.has_selected_guild ? "Dashboard" : "Selecionar servidor"}
                    </GlassButton>
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <GlassButton variant="ghost" className="w-full">
                        <LogIn className="w-4 h-4" />
                        Entrar com Discord
                      </GlassButton>
                    </Link>
                    {isLanding && (
                      <Link
                        to="/login?redirect=/checkout"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <GlassButton variant="primary" className="w-full">
                          Assinar
                        </GlassButton>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
