import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { GlassButton } from "@/components/ui/GlassButton";

export function FinalCTA() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });
  const hasDashboardAccess = true;

  const scale = useTransform(scrollYProgress, [0, 0.5], [0.95, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  return (
    <section ref={containerRef} className="py-40 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 gradient-mesh" />

      <motion.div 
        style={{ scale, opacity }}
        className="container relative"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5" />
              Comece hoje, veja resultados amanhã
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8"
          >
            Pronto para
            <br />
            <span className="text-gradient">transformar sua comunidade?</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-12"
          >
            Junte-se a mais de 50.000 comunidades que já elevaram 
            a experiência dos seus membros.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/checkout">
              <GlassButton variant="primary" size="lg" className="group min-w-[220px] text-base">
                Começar agora
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </GlassButton>
            </Link>
            {hasDashboardAccess && (
              <Link to="/dashboard">
                <GlassButton variant="ghost" size="lg" className="group min-w-[220px] text-base">
                  Ir para Dashboard
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </GlassButton>
              </Link>
            )}
            <GlassButton variant="default" size="lg" className="min-w-[220px] text-base">
              Falar com vendas
            </GlassButton>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-sm text-muted-foreground mt-10"
          >
            Não precisa de cartão de crédito • 7 dias de garantia • Cancele quando quiser
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
}
