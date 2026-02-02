import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { fetchInvite, revalidateGuild } from "@/lib/api/auth";
import { toast } from "@/components/ui/sonner";

export default function JoinInkcloud() {
  const navigate = useNavigate();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchInvite()
      .then((data) => {
        if (!mounted) return;
        if (data.in_guild) {
          navigate("/dashboard");
          return;
        }
        setInviteUrl(data.invite_url || null);
      })
      .catch((error) => {
        if (mounted) {
          const message = String(error);
          if (message.includes("401")) {
            navigate("/login");
            return;
          }
          toast({ title: "Erro ao buscar convite", description: message });
        }
      })
      .finally(() => {
        if (mounted) setLoadingInvite(false);
      });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleRevalidate = async () => {
    setChecking(true);
    try {
      const result = await revalidateGuild();
      if (result.is_in_guild) {
        navigate("/dashboard");
        return;
      }
      toast({
        title: "Ainda não encontramos você no servidor",
        description: "Entre no servidor e tente novamente."
      });
    } catch (error) {
      toast({ title: "Erro ao validar", description: String(error) });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <Header />

      <main className="pt-24 pb-16 min-h-screen flex items-center justify-center">
        <div className="container max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard className="p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />

              <div className="relative text-center space-y-6">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7" />
                </div>

                <div>
                  <h1 className="text-2xl font-semibold mb-2">Entre no servidor oficial</h1>
                  <p className="text-sm text-muted-foreground">
                    Para continuar, precisamos que você esteja no servidor da inkCloud.
                  </p>
                </div>

                <div className="space-y-3">
                  {loadingInvite ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando convite...
                    </div>
                  ) : (
                    <GlassButton
                      variant="primary"
                      className="w-full"
                      onClick={() => inviteUrl && window.open(inviteUrl, "_blank", "noopener")}
                      disabled={!inviteUrl}
                    >
                      Entrar no servidor
                      <ExternalLink className="w-4 h-4" />
                    </GlassButton>
                  )}

                  <GlassButton
                    variant="ghost"
                    className="w-full"
                    loading={checking}
                    onClick={handleRevalidate}
                  >
                    Já entrei
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
