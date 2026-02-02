import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const testimonials = [
  {
    quote: "A interface é absurdamente bonita. Configurei meu bot em 3 minutos sem ler nenhuma documentação.",
    author: "Carlos M.",
    role: "Streamer • 50k seguidores",
    avatar: "CM",
    featured: true,
  },
  {
    quote: "O analytics mudou completamente como eu gerencio minha comunidade. Dados que realmente importam.",
    author: "Ana P.",
    role: "Community Manager",
    avatar: "AP",
    featured: false,
  },
  {
    quote: "Finalmente um bot que funciona. Suporte excelente, uptime impecável.",
    author: "Lucas R.",
    role: "Desenvolvedor Indie",
    avatar: "LR",
    featured: false,
  },
  {
    quote: "Migrei de outro serviço e a diferença é gritante. Não volto mais.",
    author: "Marina S.",
    role: "YouTuber • 200k subs",
    avatar: "MS",
    featured: true,
  },
  {
    quote: "A moderação com IA é impressionante. Pega spam que eu nunca conseguiria manualmente.",
    author: "Pedro H.",
    role: "Admin de servidor",
    avatar: "PH",
    featured: false,
  },
  {
    quote: "Setup em menos de 5 minutos e já estava funcionando perfeitamente. Incrível.",
    author: "Julia C.",
    role: "Content Creator",
    avatar: "JC",
    featured: false,
  },
];

export function TestimonialsGrid() {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent" />
      <div className="absolute right-0 top-1/3 w-[500px] h-[600px] bg-white/[0.01] rounded-full blur-[120px]" />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-4 py-1.5 text-xs font-medium tracking-wider uppercase rounded-full bg-white/[0.04] text-muted-foreground border border-white/[0.08] mb-6">
            Depoimentos
          </span>
          <h2 className="heading-section mb-6">
            Amado por milhares.
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Veja o que as comunidades estão dizendo sobre o inkCloud.
          </p>
        </motion.div>

        {/* Masonry-style grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="break-inside-avoid"
            >
              <GlassCard className={`p-6 ${testimonial.featured ? 'p-8' : ''}`}>
                <Quote className="w-8 h-8 text-white/[0.06] mb-4" />
                
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>

                <blockquote className={`text-foreground/90 leading-relaxed mb-6 ${testimonial.featured ? 'text-lg' : 'text-sm'}`}>
                  "{testimonial.quote}"
                </blockquote>

                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center text-sm font-medium">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
