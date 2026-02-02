import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { GlassCard } from "@/components/ui/GlassCard";

const testimonials = [
  {
    quote: "Configurei meu bot em 3 minutos. Literalmente. A interface é tão intuitiva que não precisei de nenhum tutorial. Recomendo demais!",
    author: "Carlos M.",
    role: "Streamer • 50k seguidores",
    avatar: "CM",
    rating: 5,
  },
  {
    quote: "O analytics mudou a forma como gerencio minha comunidade. Agora sei exatamente o que engaja meus membros e posso tomar decisões baseadas em dados.",
    author: "Ana P.",
    role: "Community Manager • Tech Brasil",
    avatar: "AP",
    rating: 5,
  },
  {
    quote: "Finalmente um serviço de bot que funciona sem dor de cabeça. Suporte excelente, uptime impecável e features que realmente fazem diferença.",
    author: "Lucas R.",
    role: "Desenvolvedor • Indie Games",
    avatar: "LR",
    rating: 5,
  },
  {
    quote: "Migrei de outro serviço e a diferença é gritante. A velocidade do bot e a qualidade da moderação automática são incomparáveis.",
    author: "Marina S.",
    role: "Content Creator • YouTube",
    avatar: "MS",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-28 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.008] to-transparent" />
      <div className="absolute right-0 top-1/4 w-[400px] h-[500px] bg-white/[0.01] rounded-full blur-3xl" />
      
      <div className="container relative">
        <SectionTitle
          label="Depoimentos"
          title="O que dizem nossos usuários"
          description="Mais de 50.000 comunidades confiam no inkCloud."
        />

        <div className="mt-20 grid md:grid-cols-2 gap-5">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <GlassCard className="p-7 h-full flex flex-col relative">
                {/* Quote icon */}
                <Quote className="w-8 h-8 text-white/[0.08] absolute top-6 right-6" />
                
                {/* Rating */}
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>
                
                <blockquote className="text-base text-foreground/90 leading-relaxed flex-1 mb-6">
                  "{testimonial.quote}"
                </blockquote>
                
                <div className="pt-5 border-t border-white/[0.06] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.06] flex items-center justify-center text-sm font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{testimonial.role}</p>
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
