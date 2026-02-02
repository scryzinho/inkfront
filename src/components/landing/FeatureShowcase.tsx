import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { 
  Bot, 
  Command, 
  LineChart, 
  Lock, 
  MessageCircle, 
  Palette,
  Settings,
  Sparkles,
  Users
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const features = [
  {
    icon: Bot,
    title: "Bot dedicado",
    description: "Seu próprio bot, sempre online",
  },
  {
    icon: Command,
    title: "Comandos custom",
    description: "Crie comandos únicos",
  },
  {
    icon: LineChart,
    title: "Analytics avançado",
    description: "Métricas em tempo real",
  },
  {
    icon: Lock,
    title: "Anti-raid",
    description: "Proteção automática",
  },
  {
    icon: MessageCircle,
    title: "Auto-responder",
    description: "Respostas inteligentes",
  },
  {
    icon: Palette,
    title: "Personalização",
    description: "Seu estilo, suas regras",
  },
  {
    icon: Settings,
    title: "Config visual",
    description: "Zero código necessário",
  },
  {
    icon: Sparkles,
    title: "IA integrada",
    description: "Respostas com GPT",
  },
  {
    icon: Users,
    title: "Gestão de roles",
    description: "Automação completa",
  },
];

export function FeatureShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const x = useTransform(scrollYProgress, [0, 1], [200, -200]);

  return (
    <section ref={containerRef} className="py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent" />

      <div className="container mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="inline-block px-4 py-1.5 text-xs font-medium tracking-wider uppercase rounded-full bg-white/[0.04] text-muted-foreground border border-white/[0.08] mb-6">
            Recursos
          </span>
          <h2 className="heading-section mb-6">
            Tudo que você precisa.
            <br />
            <span className="text-gradient">Nada que não precisa.</span>
          </h2>
        </motion.div>
      </div>

      {/* Scrolling cards */}
      <motion.div style={{ x }} className="flex gap-5 px-8">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
            className="shrink-0"
          >
            <GlassCard className="w-[280px] p-6 group">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-5 group-hover:bg-white/[0.08] group-hover:border-white/[0.15] transition-all duration-500">
                <feature.icon className="w-5 h-5 text-foreground/70 group-hover:text-foreground transition-colors duration-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Second row - opposite direction */}
      <motion.div 
        style={{ x: useTransform(scrollYProgress, [0, 1], [-200, 200]) }} 
        className="flex gap-5 px-8 mt-5"
      >
        {[...features].reverse().map((feature, index) => (
          <motion.div
            key={feature.title + "-2"}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
            className="shrink-0"
          >
            <GlassCard className="w-[280px] p-6 group">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-5 group-hover:bg-white/[0.08] group-hover:border-white/[0.15] transition-all duration-500">
                <feature.icon className="w-5 h-5 text-foreground/70 group-hover:text-foreground transition-colors duration-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
