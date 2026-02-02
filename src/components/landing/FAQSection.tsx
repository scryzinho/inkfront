import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Como funciona o período de teste?",
    answer: "Você pode testar todas as funcionalidades por 7 dias gratuitamente. Não pedimos cartão de crédito para iniciar o teste. Ao final do período, você decide se quer continuar.",
  },
  {
    question: "Posso usar meu próprio bot do Discord?",
    answer: "Sim! Você usa o token do seu próprio bot. Nós apenas fornecemos a infraestrutura de alta performance e o painel de controle intuitivo. Você mantém total controle sobre seu bot.",
  },
  {
    question: "O que acontece se eu cancelar?",
    answer: "Você mantém acesso até o final do período pago. Após isso, o bot fica offline mas suas configurações são preservadas por 30 dias, permitindo que você volte a qualquer momento.",
  },
  {
    question: "Vocês oferecem suporte técnico?",
    answer: "Sim, oferecemos suporte via chat e email em português. Assinantes têm acesso a suporte prioritário com tempo de resposta médio de 2 horas durante horário comercial.",
  },
  {
    question: "Meus dados estão seguros?",
    answer: "Absolutamente. Usamos criptografia de ponta-a-ponta e seguimos as melhores práticas de segurança. Não temos acesso às mensagens do seu servidor. Seus tokens são criptografados em repouso.",
  },
  {
    question: "Posso migrar de outro serviço de bots?",
    answer: "Sim! Oferecemos migração assistida gratuita. Nossa equipe ajuda você a transferir configurações e comandos do seu serviço atual para o inkCloud sem perda de dados.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-32 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent" />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 text-xs font-medium tracking-wider uppercase rounded-full bg-white/[0.04] text-muted-foreground border border-white/[0.08] mb-6">
            FAQ
          </span>
          <h2 className="heading-section mb-6">
            Perguntas frequentes.
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Tudo que você precisa saber antes de começar.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="border-b border-white/[0.06] last:border-b-0"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full py-6 text-left flex items-start justify-between gap-6 group"
              >
                <span className={cn(
                  "text-lg font-medium transition-colors duration-300",
                  openIndex === index ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                )}>
                  {faq.question}
                </span>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                  openIndex === index 
                    ? "bg-white text-background" 
                    : "bg-white/[0.06] text-foreground group-hover:bg-white/[0.1]"
                )}>
                  {openIndex === index ? (
                    <Minus className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </div>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="overflow-hidden"
                  >
                    <p className="text-muted-foreground pb-6 pr-14 leading-relaxed">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
