import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { fetchMe, getDiscordLoginUrl } from "@/lib/api/auth";

type LoginState = "idle" | "connecting" | "success";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<LoginState>("idle");
  const redirectTo = searchParams.get("redirect") || "/checkout";

  // Check if already logged in
  useEffect(() => {
    let mounted = true;
    fetchMe()
      .then((user) => {
        if (mounted && user) {
          navigate(redirectTo);
        }
      })
      .catch(() => {
        // ignore
      });
    return () => {
      mounted = false;
    };
  }, [navigate, redirectTo]);

  const handleDiscordLogin = async () => {
    setState("connecting");
    const loginUrl = getDiscordLoginUrl(redirectTo);
    window.location.href = loginUrl;
  };

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <Header />

      <main className="pt-24 pb-16 min-h-screen flex items-center justify-center">
        <div className="container max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="p-8 relative overflow-hidden">
              {/* Glass shine effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />

              <div className="relative">
                {/* Logo */}
                <motion.div
                  className="flex justify-center mb-8"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  <div className="w-20 h-20 flex items-center justify-center overflow-hidden">
                    <img src="/logo.png" alt="inkCloud" className="w-20 h-20 object-contain" />
                  </div>
                </motion.div>

                {/* Title */}
                <motion.div
                  className="text-center mb-8"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <h1 className="text-2xl font-semibold tracking-tight mb-2">
                    Entrar no inkCloud
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Conecte sua conta Discord para continuar
                  </p>
                </motion.div>

                {/* Login Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  {state === "idle" && (
                    <motion.button
                      onClick={handleDiscordLogin}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] transition-all duration-200 font-medium text-white group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Discord Logo */}
                      <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                      </svg>
                      <span>Continuar com Discord</span>
                      <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  )}

                  {state === "connecting" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full flex flex-col items-center justify-center gap-4 py-4"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-[#5865F2]/20 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-[#5865F2] animate-spin" />
                        </div>
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-[#5865F2]/30"
                          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="font-medium">Conectando ao Discord...</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Aguarde a autorização
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {state === "success" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full flex flex-col items-center justify-center gap-4 py-4"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"
                      >
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                      </motion.div>
                      <div className="text-center">
                        <p className="font-medium">Login realizado!</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Redirecionando...
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Footer */}
                <motion.div
                  className="mt-8 pt-6 border-t border-white/5 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  <p className="text-xs text-muted-foreground">
                    Ao continuar, você concorda com os{" "}
                    <a href="#" className="text-foreground underline underline-offset-2 hover:text-white transition-colors">
                      Termos de Uso
                    </a>{" "}
                    e{" "}
                    <a href="#" className="text-foreground underline underline-offset-2 hover:text-white transition-colors">
                      Política de Privacidade
                    </a>
                  </p>
                </motion.div>
              </div>
            </GlassCard>

            {/* Additional Info */}
            <motion.p
              className="text-center text-xs text-muted-foreground mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              🔒 Sua conta está protegida e seus dados são criptografados
            </motion.p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
