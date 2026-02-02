import { motion } from "framer-motion";
import { Key, Settings, Rocket, ArrowRight } from "lucide-react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { GlassCard } from "@/components/ui/GlassCard";

const steps = [
  {
    icon: Key,
    step: "01",
    title: "Conecte seu bot",
    description: "Cole o token do seu bot Discord. Validamos automaticamente e cuidamos de toda a configuração inicial.",
  },
  {
    icon: Settings,
    step: "02",
    title: "Configure tudo",
    description: "Defina permissões, canais, roles e personalize o comportamento do bot com nossa interface visual.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Lance e escale",
    description: "Seu bot está online e pronto para engajar sua comunidade. Monitore em tempo real pelo dashboard.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-28 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] via-transparent to-white/[0.01]" />
      
      <div className="container relative">
        <SectionTitle
          label="Como funciona"
          title="Três passos simples"
          description="Do zero ao bot funcionando em menos de 5 minutos. Sem código, sem complicação."
        />

        <div className="mt-20 grid md:grid-cols-3 gap-6 relative">
          {/* Connection lines for desktop */}
          <div className="hidden md:block absolute top-1/2 left-1/4 right-1/4 h-px bg-gradient-to-r from-white/[0.05] via-white/[0.1] to-white/[0.05] -translate-y-8" />
          
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: index * 0.15 }}
              className="relative"
            >
              <GlassCard className="p-8 h-full text-center relative overflow-visible">
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-medium text-muted-foreground">
                  Passo {step.step}
                </div>
                
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-6 mt-4 group-hover:bg-white/[0.08] transition-all duration-500">
                  <step.icon className="w-7 h-7 text-foreground/70" />
                </div>
                <h3 className="heading-card mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </GlassCard>
              
              {/* Arrow for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="w-5 h-5 text-white/20" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
