import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, Sparkles, ArrowRight, Plus, Bot, Headphones, ShoppingCart, Shield } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useState } from "react";

const baseFeatures = [
  "Bot dedicado 24/7",
  "Comandos ilimitados",
  "Analytics completo",
  "Suporte prioritário",
  "Atualizações grátis",
  "Painel de controle",
];

const addons = [
  {
    id: "ai-support",
    icon: Headphones,
    name: "Suporte com IA",
    description: "IA atende tickets com prompts configuráveis",
    price: 15,
  },
  {
    id: "ai-interaction",
    icon: Bot,
    name: "Interação com IA",
    description: "Bot conversa naturalmente com usuários",
    price: 12,
  },
  {
    id: "auto-sales",
    icon: ShoppingCart,
    name: "Vendas Automáticas",
    description: "Sistema de vendas 100% automatizado",
    price: 20,
  },
  {
    id: "backup-verify",
    icon: Shield,
    name: "Backup & Verificação",
    description: "Nunca perca seus membros",
    price: 10,
  },
];

export function CompactPricing() {
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => 
      prev.includes(id) 
        ? prev.filter(a => a !== id)
        : [...prev, id]
    );
  };

  const basePrice = 29;
  const addonsTotal = selectedAddons.reduce((sum, id) => {
    const addon = addons.find(a => a.id === id);
    return sum + (addon?.price || 0);
  }, 0);
  const totalPrice = basePrice + addonsTotal;

  return (
    <section id="precos" className="py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent" />
      
      <div className="container relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 text-xs font-medium tracking-wider uppercase rounded-full bg-white/[0.04] text-muted-foreground border border-white/[0.08] mb-6">
            Preços
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            Simples. <span className="text-gradient">Flexível.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Comece com o plano base e adicione recursos conforme sua necessidade.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Base Plan Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <GlassCard className="p-8 h-full relative overflow-hidden" hover={false}>
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              
              <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-white/[0.08] border border-white/[0.12] text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Plano Base
              </div>

              <div className="pt-6 mb-8">
                <p className="text-sm text-muted-foreground mb-2">inkCloud Monthly</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight">R${basePrice}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {baseFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-sm text-foreground/90">{feature}</span>
                  </li>
                ))}
              </ul>

              <p className="text-xs text-muted-foreground">
                Cancele quando quiser • 7 dias de garantia
              </p>
            </GlassCard>
          </motion.div>

          {/* Addons Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <GlassCard className="p-8 h-full" hover={false}>
              <h3 className="text-lg font-semibold mb-2">Adicionais</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Selecione os recursos extras que deseja incluir
              </p>

              <div className="space-y-3">
                {addons.map((addon) => {
                  const isSelected = selectedAddons.includes(addon.id);
                  return (
                    <motion.button
                      key={addon.id}
                      onClick={() => toggleAddon(addon.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all duration-300 ${
                        isSelected 
                          ? 'bg-white/[0.08] border-white/[0.2]' 
                          : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-white/[0.15]' : 'bg-white/[0.06]'
                        }`}>
                          <addon.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm">{addon.name}</span>
                            <span className="text-sm font-semibold whitespace-nowrap">
                              +R${addon.price}/mês
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {addon.description}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected 
                            ? 'bg-white border-white' 
                            : 'border-white/30'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-background" />}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                Você pode adicionar ou remover a qualquer momento
              </p>
            </GlassCard>
          </motion.div>
        </div>

        {/* Total and CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-8 max-w-5xl mx-auto"
        >
          <GlassCard className="p-6" hover={false}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-sm text-muted-foreground mb-1">Total mensal</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight">R${totalPrice}</span>
                  <span className="text-muted-foreground">/mês</span>
                  {selectedAddons.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      (base + {selectedAddons.length} {selectedAddons.length === 1 ? 'adicional' : 'adicionais'})
                    </span>
                  )}
                </div>
              </div>
              <Link to="/checkout">
                <GlassButton variant="primary" size="lg" className="group min-w-[200px]">
                  Assinar agora
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </GlassButton>
              </Link>
            </div>
          </GlassCard>
        </motion.div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-sm text-muted-foreground mt-6"
        >
          Não precisa de cartão para testar • Suporte em português
        </motion.p>
      </div>
    </section>
  );
}
