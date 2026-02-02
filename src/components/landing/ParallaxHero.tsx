import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Package, Shield, Headphones, ShoppingCart } from "lucide-react";
import { GlassButton } from "@/components/ui/GlassButton";

const highlights = [
  { icon: Package, label: "Estoque Incluso" },
  { icon: Shield, label: "Backup Automático" },
  { icon: Headphones, label: "Suporte com IA" },
  { icon: ShoppingCart, label: "Vendas Automáticas" },
];

export function ParallaxHero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-32 overflow-hidden">
      {/* Gradient background - monochrome clean */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
      
      {/* Subtle animated orbs - monochrome */}
      <motion.div 
        animate={{ 
          x: [0, 30, 0],
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[150px]"
      />
      <motion.div 
        animate={{ 
          x: [0, -20, 0],
          y: [0, 30, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-white/[0.015] rounded-full blur-[120px]"
      />
      
      {/* Main content - centered and clean like Apple Card */}
      <div className="container relative z-10 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-white/[0.06] border border-white/[0.1] text-muted-foreground backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            inkCloud
          </span>
        </motion.div>

        {/* Headline - Apple Card style typography */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
        >
          <span className="block">Automatize tudo.</span>
          <span className="block text-gradient">Venda sempre.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Bot completo para vendas automáticas, estoque incluso, backup de membros
          e proteção total da sua comunidade Discord.
        </motion.p>

        {/* CTA Button - centered like Apple */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mb-16"
        >
          <Link to="/checkout">
            <GlassButton variant="primary" size="lg" className="group px-10 py-5 text-base">
              Começar agora
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </GlassButton>
          </Link>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-3 mb-20"
        >
          {highlights.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-foreground/80"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              {item.label}
            </motion.div>
          ))}
        </motion.div>

        {/* Feature highlights cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto"
        >
          {[
            {
              title: "IA de Suporte",
              description: "Atende tickets automaticamente com prompts totalmente configuráveis",
            },
            {
              title: "Vendas Automáticas",
              description: "Sistema completo de vendas 100% automatizado e integrado",
            },
            {
              title: "Backup & Verificação",
              description: "Nunca perca seus membros com sistema de backup inteligente",
            },
            {
              title: "Interação com IA",
              description: "Bot interage naturalmente com seus usuários usando IA avançada",
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
              className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm text-left"
            >
              <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
