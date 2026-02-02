import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";

export function CTASection() {
  return (
    <section className="py-28 relative">
      {/* Background effects */}
      <div className="absolute inset-0 gradient-mesh opacity-60" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl" />
      
      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <GlassCard className="p-12 md:p-16 text-center relative overflow-hidden" hover={false}>
            {/* Top gradient line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            
            {/* Decorative elements */}
            <div className="absolute top-8 left-8 w-24 h-24 bg-white/[0.02] rounded-full blur-2xl" />
            <div className="absolute bottom-8 right-8 w-32 h-32 bg-white/[0.02] rounded-full blur-2xl" />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-muted-foreground mb-8"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Comece hoje, veja resultados amanhã
            </motion.div>
            
            <h2 className="heading-section mb-6 text-balance">
              Pronto para elevar sua comunidade?
            </h2>
            
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 text-balance">
              Junte-se a mais de 50.000 comunidades que já transformaram 
              a experiência dos seus membros com inkCloud.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/checkout">
                <GlassButton variant="primary" size="lg" className="group min-w-[200px]">
                  Começar agora
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </GlassButton>
              </Link>
              <GlassButton variant="default" size="lg" className="min-w-[200px]">
                Falar com vendas
              </GlassButton>
            </div>
            
            <p className="text-xs text-muted-foreground mt-8">
              Não precisa de cartão de crédito para testar • 7 dias de garantia
            </p>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
