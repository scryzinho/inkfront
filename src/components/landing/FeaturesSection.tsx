import { motion } from "framer-motion";
import { 
  Shield, 
  Zap, 
  BarChart3, 
  Users, 
  Clock, 
  Lock,
  Bot,
  Settings,
  MessageSquare
} from "lucide-react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { GlassCard } from "@/components/ui/GlassCard";

const features = [
  {
    icon: Shield,
    title: "Moderação automática",
    description: "Filtros inteligentes com IA e ações automáticas para manter sua comunidade segura e saudável.",
  },
  {
    icon: Zap,
    title: "Respostas instantâneas",
    description: "Latência ultrabaixa para comandos e interações em tempo real. Sem delay, sem travamentos.",
  },
  {
    icon: BarChart3,
    title: "Analytics detalhado",
    description: "Métricas e insights completos sobre engajamento, crescimento e comportamento do servidor.",
  },
  {
    icon: Users,
    title: "Gestão de membros",
    description: "Controle roles, permissões e onboarding de forma centralizada e automatizada.",
  },
  {
    icon: Clock,
    title: "Uptime garantido",
    description: "99.9% de disponibilidade com monitoramento 24/7 e alertas em tempo real.",
  },
  {
    icon: Lock,
    title: "Segurança avançada",
    description: "Criptografia de ponta a ponta e proteção contra raids, spam e abusos.",
  },
  {
    icon: Bot,
    title: "IA Integrada",
    description: "Respostas inteligentes e automatização de tarefas com modelos de linguagem avançados.",
  },
  {
    icon: Settings,
    title: "Configuração fácil",
    description: "Interface intuitiva e visual para configurar seu bot sem escrever uma linha de código.",
  },
  {
    icon: MessageSquare,
    title: "Comandos custom",
    description: "Crie comandos personalizados ilimitados com condições, variáveis e respostas dinâmicas.",
  },
];

export function FeaturesSection() {
  return (
    <section id="recursos" className="py-28 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.008] to-transparent" />
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[400px] h-[600px] bg-white/[0.01] rounded-full blur-3xl" />
      <div className="absolute right-0 top-1/3 w-[300px] h-[400px] bg-white/[0.01] rounded-full blur-3xl" />
      
      <div className="container relative">
        <SectionTitle
          label="Recursos"
          title="Tudo que você precisa"
          description="Ferramentas poderosas em uma interface simples e elegante."
        />

        <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.08 }}
            >
              <GlassCard className="p-7 h-full group">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:bg-white/[0.08] group-hover:border-white/[0.12] transition-all duration-500">
                  <feature.icon className="w-6 h-6 text-foreground/70 group-hover:text-foreground/90 transition-colors duration-500" />
                </div>
                <h3 className="heading-card mb-3">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
