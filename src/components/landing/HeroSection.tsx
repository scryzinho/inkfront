import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Shield, Zap, BarChart3 } from "lucide-react";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";

const stats = [
  { value: "50k+", label: "Usuários ativos" },
  { value: "99.9%", label: "Uptime garantido" },
  { value: "< 50ms", label: "Latência média" },
];

const quickFeatures = [
  { icon: Shield, label: "Moderação IA" },
  { icon: Zap, label: "Tempo real" },
  { icon: BarChart3, label: "Analytics" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-20 overflow-hidden">
      {/* Enhanced Background effects */}
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-white/[0.015] rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-[600px] h-[600px] bg-white/[0.01] rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-white/[0.02] to-transparent rounded-full" />
      
      <div className="container relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex justify-center mb-8"
          >
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-muted-foreground backdrop-blur-xl">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Novo: Painel de controle avançado com IA
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="heading-hero text-center mb-8"
          >
            Gerencie seu bot Discord
            <br />
            <span className="text-gradient">sem complicação</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-center text-balance text-label"
          >
            Configure, monitore e escale seu bot com uma interface intuitiva. 
            Sem código, sem dor de cabeça. Apenas resultados.
          </motion.p>

          {/* Quick Features Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-wrap justify-center gap-3 mb-10"
          >
            {quickFeatures.map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-sm text-muted-foreground"
              >
                <feature.icon className="w-4 h-4" />
                {feature.label}
              </motion.div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link to="/checkout">
              <GlassButton variant="primary" size="lg" className="group min-w-[200px]">
                Começar agora
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </GlassButton>
            </Link>
            <GlassButton variant="default" size="lg" className="min-w-[200px]">
              <Play className="w-4 h-4" />
              Ver demonstração
            </GlassButton>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-16"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
              >
                <GlassCard className="p-5 text-center" hover={false}>
                  <div className="text-2xl md:text-3xl font-bold tracking-tight mb-1">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="pt-10 border-t border-white/[0.04]"
          >
            <p className="text-sm text-muted-foreground mb-8 text-center text-label">
              Usado por times e criadores de conteúdo em todo o Brasil
            </p>
            <div className="flex items-center justify-center gap-10 md:gap-16">
              {["Discord", "Twitch", "YouTube", "Steam", "Spotify"].map((brand, index) => (
                <motion.span 
                  key={brand} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                  whileHover={{ opacity: 0.8 }}
                  className="text-sm font-medium tracking-wider cursor-default transition-opacity duration-300"
                >
                  {brand}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
