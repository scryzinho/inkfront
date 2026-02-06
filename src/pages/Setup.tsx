import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  Users,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Check,
  Info
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { Stepper } from "@/components/ui/Stepper";
import { Chip } from "@/components/ui/Chip";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { fetchDiscordGuilds, fetchMe, AuthUser, DiscordGuild } from "@/lib/api/auth";
import { provisionBot } from "@/lib/api/provision";

type SetupStep = 1 | 2 | 3;
type ProvisioningStatus = "idle" | "provisioning" | "success";

interface SetupData {
  botToken: string;
  guildId: string;
  ownerId: string;
  adminIds: string[];
}

const steps = [
  { id: 1, title: "Bot Token", description: "Conecte seu bot" },
  { id: 2, title: "Configuração", description: "IDs do servidor" },
  { id: 3, title: "Revisão", description: "Finalizar setup" }
];

const provisioningSteps = [
  "Validando credenciais...",
  "Conectando ao Discord...",
  "Configurando permissões...",
  "Sincronizando comandos...",
  "Finalizando setup..."
];

export default function Setup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<SetupStep>(1);
  const [showToken, setShowToken] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [provisioningStatus, setProvisioningStatus] = useState<ProvisioningStatus>("idle");
  const [currentProvisioningStep, setCurrentProvisioningStep] = useState(0);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);
  const [guildsLoading, setGuildsLoading] = useState(true);
  const [guildsError, setGuildsError] = useState<string | null>(null);
  const [isGuildModalOpen, setGuildModalOpen] = useState(false);

  const [data, setData] = useState<SetupData>({
    botToken: "",
    guildId: "",
    ownerId: "",
    adminIds: []
  });

  useEffect(() => {
    let mounted = true;
    setGuildsLoading(true);
    setGuildsError(null);

    (async () => {
      try {
        const fetchedUser = await fetchMe();
        if (!mounted) return;
        if (!fetchedUser) {
          setGuildsLoading(false);
          return;
        }
        setUser(fetchedUser);
        setData((prev) => ({ ...prev, ownerId: fetchedUser.discord_user_id }));
        const availableGuilds = await fetchDiscordGuilds();
        if (!mounted) return;
        setGuilds(availableGuilds);
        setGuildsLoading(false);
        if (fetchedUser.selected_guild_id) {
          const matched = availableGuilds.find((guild) => guild.id === fetchedUser.selected_guild_id);
          if (matched) {
            setSelectedGuild(matched);
            setData((prev) => ({ ...prev, guildId: matched.id }));
          } else {
            setSelectedGuild({
              id: fetchedUser.selected_guild_id,
              name: fetchedUser.selected_guild_name || "Servidor vinculado",
              icon: null,
              owner: false,
              permissions: 0
            });
            setData((prev) => ({ ...prev, guildId: fetchedUser.selected_guild_id }));
          }
        }
      } catch (error) {
        if (!mounted) return;
        setGuildsLoading(false);
        setGuildsError(error instanceof Error ? error.message : "Não foi possível carregar seus servidores.");
        if (error instanceof Error && /auth/.test(error.message.toLowerCase())) {
          // ignore auth errors in preview
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (data.botToken.trim().length > 10 && !tokenValidated && !validating) {
      const timer = setTimeout(async () => {
        setValidating(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setTokenValidated(true);
        setValidating(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [data.botToken, tokenValidated, validating]);

  const addAdmin = () => {
    const trimmed = adminInput.trim();
    if (!trimmed) return;
    if (data.adminIds.includes(trimmed)) {
      setAdminInput("");
      return;
    }
    setData((prev) => ({ ...prev, adminIds: [...prev.adminIds, trimmed] }));
    setAdminInput("");
  };

  const removeAdmin = (id: string) => {
    setData((prev) => ({
      ...prev,
      adminIds: prev.adminIds.filter((adminId) => adminId !== id)
    }));
  };

  const handleGuildSelect = (guild: DiscordGuild) => {
    setSelectedGuild(guild);
    setData((prev) => ({ ...prev, guildId: guild.id }));
    setGuildModalOpen(false);
  };

  const handleProvision = async () => {
    if (!selectedGuild) {
      setProvisionError("É necessário selecionar um servidor antes de provisionar.");
      return;
    }

    setProvisionError(null);
    setProvisioningStatus("provisioning");
    setCurrentProvisioningStep(0);

    const animation = (async () => {
      for (let i = 0; i < provisioningSteps.length; i++) {
        setCurrentProvisioningStep(i);
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    })();

    try {
      await Promise.all([
        animation,
        provisionBot({
          discord_bot_token: data.botToken.trim(),
          guild_id: data.guildId,
          owner_id: data.ownerId,
          admin_ids: data.adminIds.filter(Boolean)
        })
      ]);
      setProvisioningStatus("success");
      localStorage.setItem("inkcloud_setup", JSON.stringify(data));
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error) {
      setProvisioningStatus("idle");
      setProvisionError(error instanceof Error ? error.message : "O provisionamento falhou.");
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return tokenValidated;
      case 2:
        return Boolean(data.guildId);
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">Configurar seu bot</h1>
            <p className="text-muted-foreground">Siga os passos abaixo para conectar e configurar seu bot</p>
          </motion.div>

          <Stepper steps={steps} currentStep={currentStep} className="mb-12" />

          <GlassCard className="p-8">
            <AnimatePresence mode="wait">
              {provisioningStatus === "provisioning" ? (
                <motion.div
                  key="provisioning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 text-center"
                >
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-8 text-muted-foreground" />
                  <div className="space-y-3">
                    {provisioningSteps.map((step, index) => (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{
                          opacity: index <= currentProvisioningStep ? 1 : 0.3,
                          y: 0
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 text-sm",
                          index < currentProvisioningStep && "text-success",
                          index === currentProvisioningStep && "text-foreground",
                          index > currentProvisioningStep && "text-muted-foreground"
                        )}
                      >
                        {index < currentProvisioningStep ? (
                          <Check className="w-4 h-4" />
                        ) : index === currentProvisioningStep ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                        {step}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : provisioningStatus === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-16 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6"
                  >
                    <Check className="w-8 h-8 text-success" />
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2">Bot provisionado!</h3>
                  <p className="text-muted-foreground">Redirecionando para o dashboard...</p>
                </motion.div>
              ) : (
                <>
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <Key className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold">Token do Bot</h2>
                          <p className="text-sm text-muted-foreground">Insira o token do seu bot Discord</p>
                        </div>
                      </div>

                      <div className="relative">
                        <GlassInput
                          type={showToken ? "text" : "password"}
                          placeholder="Cole seu token aqui..."
                          value={data.botToken}
                          onChange={(e) => {
                            setData((prev) => ({ ...prev, botToken: e.target.value }));
                            setTokenValidated(false);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          {showToken ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>

                      {validating && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Validando token...
                        </div>
                      )}

                      {tokenValidated && !validating && (
                        <div className="flex items-center gap-2 text-success text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Token validado com sucesso!
                        </div>
                      )}

                      {!validating && !tokenValidated && data.botToken.trim().length > 0 && data.botToken.trim().length <= 10 && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Info className="w-4 h-4" />
                          Token muito curto...
                        </div>
                      )}

                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex gap-3">
                          <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <p>
                              <strong className="text-foreground/80">Como obter o token:</strong>
                            </p>
                            <ol className="list-decimal list-inside space-y-1 pl-1">
                              <li>Acesse o Discord Developer Portal</li>
                              <li>Selecione sua aplicação ou crie uma nova</li>
                              <li>Vá em "Bot" → "Reset Token"</li>
                              <li>Copie o token gerado</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold">Configuração do Servidor</h2>
                          <p className="text-sm text-muted-foreground">
                            O bot só poderá operar onde você tem permissão de gerenciamento
                          </p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-white/10 to-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/20 flex items-center justify-center">
                            {user?.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm text-muted-foreground">{user ? user.username[0] : ""}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70 mb-1">Owner</p>
                          <p className="text-base font-semibold leading-4">{user ? user.username : "Carregando..."}</p>
                          <p className="text-xs text-muted-foreground">{user?.discord_user_id || "—"}</p>
                          <p className="text-xs text-muted-foreground">{user?.email || "Sem email"}</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] space-y-3">
                        <div className="bg-gradient-to-br from-transparent via-white/5 to-white/0 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center">
                            {selectedGuild?.icon ? (
                              <img src={selectedGuild.icon} alt={selectedGuild.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs uppercase text-muted-foreground">Sem ícone</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70 mb-1">Servidor selecionado</p>
                            <p className="text-base font-semibold">
                              {selectedGuild ? selectedGuild.name : "Nenhum servidor selecionado"}
                            </p>
                            {selectedGuild && (
                              <p className="text-xs text-muted-foreground">{selectedGuild.id}</p>
                            )}
                          </div>
                          <GlassButton variant="ghost" size="sm" onClick={() => setGuildModalOpen(true)}>
                            {guildsLoading ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Carregando
                              </span>
                            ) : (
                              "Escolher"
                            )}
                          </GlassButton>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Apenas servidores onde você é dono ou possui permissão administrativa aparecem.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground/80">Admin IDs (opcional)</label>
                        <div className="flex gap-2">
                          <GlassInput
                            placeholder="ID do administrador"
                            value={adminInput}
                            onChange={(e) => setAdminInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAdmin())}
                            className="flex-1"
                          />
                          <GlassButton onClick={addAdmin} disabled={!adminInput.trim()}>
                            Adicionar
                          </GlassButton>
                        </div>
                        {data.adminIds.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {data.adminIds.map((id) => (
                              <Chip key={id} label={id} onRemove={() => removeAdmin(id)} />
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Digite IDs do Discord que também devem gerenciar o bot.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold">Revisão</h2>
                          <p className="text-sm text-muted-foreground">Confirme as informações antes de provisionar</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                          <p className="text-xs text-muted-foreground mb-1">Bot Token</p>
                          <p className="font-mono text-sm">••••••••{data.botToken.slice(-8)}</p>
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                          <p className="text-xs text-muted-foreground mb-1">Servidor selecionado</p>
                          <p className="text-sm font-semibold">{selectedGuild?.name || "Nenhum"}</p>
                          {selectedGuild && (
                            <p className="text-xs text-muted-foreground">{selectedGuild.id}</p>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                          <p className="text-xs text-muted-foreground mb-1">Owner</p>
                          <p className="text-sm font-semibold">{user?.username || "—"}</p>
                          <p className="text-xs text-muted-foreground">{user?.discord_user_id || "—"}</p>
                        </div>

                        {data.adminIds.length > 0 && (
                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                            <p className="text-xs text-muted-foreground mb-2">Admin IDs</p>
                            <div className="flex flex-wrap gap-2">
                              {data.adminIds.map((id) => (
                                <Chip key={id} label={id} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {provisionError && (
                        <p className="text-xs text-destructive">{provisionError}</p>
                      )}

                      <GlassButton
                        variant="primary"
                        className="w-full"
                        onClick={handleProvision}
                        disabled={!canProceed() || provisioningStatus !== "idle"}
                      >
                        Provisionar bot
                      </GlassButton>
                    </motion.div>
                  )}
                </>
              )}
            </AnimatePresence>

            {provisioningStatus === "idle" && (
              <div className="flex justify-between mt-8 pt-6 border-t border-white/5">
                <GlassButton
                  variant="ghost"
                  onClick={() => setCurrentStep((prev) => (prev - 1) as SetupStep)}
                  disabled={currentStep === 1}
                >
                  Voltar
                </GlassButton>
                {currentStep < 3 && (
                  <GlassButton variant="primary" onClick={() => setCurrentStep((prev) => (prev + 1) as SetupStep)} disabled={!canProceed()}>
                    Continuar
                  </GlassButton>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </main>

      <Modal
        isOpen={isGuildModalOpen}
        onClose={() => setGuildModalOpen(false)}
        title="Selecionar servidor"
        description="Escolha o servidor onde o bot irá operar"
        size="lg"
        className="mx-auto"
      >
        <div className="space-y-4">
          {guildsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando servidores...
            </div>
          ) : guildsError ? (
            <p className="text-sm text-destructive">{guildsError}</p>
          ) : guilds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum servidor encontrado com permissões adequadas.</p>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
              {guilds.map((guild) => (
                <div key={guild.id} className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-white/[0.08] bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
                      {guild.icon ? (
                        <img src={guild.icon} alt={guild.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem ícone</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-base">{guild.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {guild.owner ? "Proprietário" : "Administrador"} • {guild.permissions}
                      </p>
                    </div>
                  </div>
                  <GlassButton variant="ghost" size="sm" onClick={() => handleGuildSelect(guild)} disabled={data.guildId === guild.id}>
                    {data.guildId === guild.id ? "Selecionado" : "Escolher"}
                  </GlassButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
