import { motion } from "framer-motion";
import { CreditCard, Smartphone, Bitcoin, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const paymentMethods = [
  {
    icon: CreditCard,
    name: "Cartão de Crédito",
    description: "Visa, Mastercard, Elo e mais",
    brands: ["Visa", "Mastercard", "Elo", "Amex"],
  },
  {
    icon: Smartphone,
    name: "Pix",
    description: "Pagamento instantâneo 24h",
    brands: ["Instantâneo", "Sem taxas", "24/7"],
  },
  {
    icon: Bitcoin,
    name: "Criptomoedas",
    description: "Bitcoin, Ethereum e outras",
    brands: ["BTC", "ETH", "USDT", "LTC"],
  },
];

export function PaymentMethods() {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent" />
      
      <div className="container relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium tracking-wider uppercase rounded-full bg-white/[0.04] text-muted-foreground border border-white/[0.08] mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            Pagamentos Seguros
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Aceite pagamentos <span className="text-gradient">como preferir.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Diversas formas de pagamento integradas ao seu bot para facilitar as vendas.
          </p>
        </motion.div>

        {/* Payment Methods Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {paymentMethods.map((method, index) => (
            <motion.div
              key={method.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <GlassCard className="p-6 h-full text-center" hover>
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1, type: "spring" }}
                  className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mx-auto mb-4"
                >
                  <method.icon className="w-7 h-7" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-1">{method.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{method.description}</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {method.brands.map((brand) => (
                    <span
                      key={brand}
                      className="px-2 py-1 text-xs rounded-md bg-white/[0.04] border border-white/[0.06] text-muted-foreground"
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Security note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-10"
        >
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success" />
            Todas as transações são criptografadas e seguras
          </p>
        </motion.div>
      </div>
    </section>
  );
}
