import { motion } from "framer-motion";
import { Shield, Headphones, ShoppingCart, Package, CreditCard, Wallet } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const features = [
  {
    icon: Headphones,
    title: "Suporte com IA",
    subtitle: "Atendimento 24/7.",
    description: "IA que atende tickets automaticamente com prompts totalmente configuráveis. Resolva problemas antes mesmo de ver a notificação.",
    visual: "support",
  },
  {
    icon: Package,
    title: "Venda Sem Estoque",
    subtitle: "Produtos inclusos.",
    description: "A ink fornece um catálogo completo de produtos digitais como Netflix, Discord Nitro, Spotify e muito mais. Venda sem se preocupar com estoque.",
    visual: "stock",
  },
  {
    icon: ShoppingCart,
    title: "Vendas Automáticas",
    subtitle: "100% automatizado.",
    description: "Sistema completo de vendas integrado. Do carrinho à entrega, tudo funciona no piloto automático enquanto você foca no crescimento.",
    visual: "sales",
  },
  {
    icon: Shield,
    title: "Backup & Verificação",
    subtitle: "Nunca perca membros.",
    description: "Sistema inteligente de backup e verificação que protege sua comunidade. Recupere membros e mantenha seu servidor sempre seguro.",
    visual: "backup",
  },
];

function FeatureVisual({ type }: { type: string }) {
  if (type === "support") {
    return (
      <div className="relative h-full flex items-center justify-center">
        <div className="space-y-3 w-full max-w-xs">
          {[
            { msg: "Preciso de ajuda com minha compra", type: "user" },
            { msg: "Claro! Localizei seu pedido #4521. Como posso ajudar?", type: "bot" },
            { msg: "Ticket resolvido automaticamente ✓", type: "status" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: item.type === "user" ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.2 }}
              className={`p-3 rounded-xl text-sm ${
                item.type === "user" 
                  ? "bg-white/[0.06] border border-white/[0.1] mr-8"
                  : item.type === "bot"
                  ? "bg-white/[0.03] border border-white/[0.06] ml-8"
                  : "bg-success/10 border border-success/20 text-success text-center text-xs"
              }`}
            >
              {item.msg}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "stock") {
    const products = [
      { name: "Netflix", color: "bg-red-500/20", textColor: "text-red-400" },
      { name: "Discord Nitro", color: "bg-indigo-500/20", textColor: "text-indigo-400" },
      { name: "Spotify", color: "bg-green-500/20", textColor: "text-green-400" },
      { name: "Xbox Game Pass", color: "bg-emerald-500/20", textColor: "text-emerald-400" },
      { name: "Steam", color: "bg-blue-500/20", textColor: "text-blue-400" },
      { name: "+ Diversos", color: "bg-white/[0.06]", textColor: "text-muted-foreground" },
    ];
    return (
      <div className="relative h-full flex items-center justify-center">
        <div className="w-full max-w-xs">
          <div className="grid grid-cols-2 gap-2">
            {products.map((product, i) => (
              <motion.div
                key={product.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                className={`p-3 rounded-xl ${product.color} border border-white/[0.06] text-center`}
              >
                <span className={`text-sm font-medium ${product.textColor}`}>{product.name}</span>
              </motion.div>
            ))}
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-xs text-muted-foreground text-center mt-4"
          >
            Estoque fornecido pela ink • Reposição automática
          </motion.p>
        </div>
      </div>
    );
  }

  if (type === "interaction") {
    return (
      <div className="relative h-full flex items-center justify-center">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, type: "spring" }}
            className="w-20 h-20 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mx-auto mb-4"
          >
            <Package className="w-10 h-10 text-white/60" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-2"
          >
            <p className="text-sm text-muted-foreground">Respondendo com contexto...</p>
            <div className="flex items-center justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 rounded-full bg-white/40"
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (type === "sales") {
    return (
      <div className="relative h-full flex items-center justify-center">
        <div className="w-full max-w-xs space-y-3">
          {[
            { label: "Vendas hoje", value: "R$ 2.847", trend: "+23%" },
            { label: "Conversão", value: "94%", trend: "+5%" },
            { label: "Pedidos", value: "47", trend: "+12" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.15 }}
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
            >
              <div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className="text-lg font-bold">{stat.value}</div>
              </div>
              <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                {stat.trend}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "backup") {
    return (
      <div className="relative h-full flex items-center justify-center">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, type: "spring" }}
            className="relative w-24 h-24 mx-auto mb-4"
          >
            <div className="absolute inset-0 rounded-full bg-white/[0.04] border border-white/[0.1]" />
            <motion.div
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.3 }}
              className="absolute inset-0"
            >
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray="264"
                  strokeDashoffset="26"
                  className="text-success"
                />
              </svg>
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">100%</span>
            </div>
          </motion.div>
          <p className="text-sm text-muted-foreground">Membros protegidos</p>
          <p className="text-xs text-success mt-1">Último backup: agora</p>
        </div>
      </div>
    );
  }

  return null;
}

export function ImmersiveFeatures() {
  return (
    <section className="py-16 relative">
      <div className="container">
        {features.map((feature, index) => {
          const isReversed = index % 2 === 1;
          
          return (
            <div key={feature.title} className="mb-32 last:mb-0">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${isReversed ? 'lg:grid-flow-dense' : ''}`}
              >
                {/* Text content */}
                <div className={isReversed ? 'lg:col-start-2' : ''}>
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-muted-foreground mb-6">
                      <feature.icon className="w-3.5 h-3.5" />
                      {feature.subtitle}
                    </div>
                    <h3 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                      {feature.title}
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                      {feature.description}
                    </p>
                  </motion.div>
                </div>

                {/* Visual */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  className={isReversed ? 'lg:col-start-1' : ''}
                >
                  <GlassCard className="aspect-square p-8" hover={false}>
                    <FeatureVisual type={feature.visual} />
                  </GlassCard>
                </motion.div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
