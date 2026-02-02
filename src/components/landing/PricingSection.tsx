import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";

const features = [
  "Bot dedicado 24/7 com uptime garantido",
  "Moderação automática com IA",
  "Comandos personalizados ilimitados",
  "Analytics completo e dashboards",
  "Suporte prioritário via Discord",
  "Atualizações automáticas",
  "Logs detalhados de eventos",
  "Configurações avançadas",
];

const bonuses = [
  "Setup assistido gratuito",
  "Migração de outros bots",
  "Templates prontos para uso",
];

export function PricingSection() {
  return (
    <section id="precos" className="py-28 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.005] to-transparent" />
      
      <div className="container relative">
        <SectionTitle
          label="Preços"
          title="Simples e transparente"
          description="Um plano único com tudo incluso. Sem surpresas, sem taxas ocultas."
        />

        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-20 max-w-lg mx-auto"
        >
          <GlassCard className="p-10 relative overflow-hidden" hover={false}>
            {/* Top highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            
            {/* Popular badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] text-xs font-medium flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Mais popular
            </div>
            
            <div className="text-center mb-10 pt-4">
              <span className="text-sm text-muted-foreground text-label">inkCloud Monthly</span>
              <div className="mt-5 flex items-baseline justify-center gap-1">
                <span className="text-6xl font-bold tracking-tight">R$29</span>
                <span className="text-muted-foreground text-lg">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Faturado mensalmente • Cancele quando quiser
              </p>
            </div>

            <div className="space-y-8">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4 text-label">Incluso no plano</p>
                <ul className="space-y-3.5">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-foreground/90 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 border-t border-white/[0.06]">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4 text-label">Bônus exclusivos</p>
                <ul className="space-y-3">
                  {bonuses.map((bonus) => (
                    <li key={bonus} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-success" />
                      </div>
                      <span className="text-sm text-foreground/90">{bonus}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Link to="/checkout" className="block mt-10">
              <GlassButton variant="primary" className="w-full py-4 text-base">
                Assinar agora
              </GlassButton>
            </Link>

            <p className="text-xs text-center text-muted-foreground mt-5">
              7 dias de garantia • Suporte em português
            </p>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
