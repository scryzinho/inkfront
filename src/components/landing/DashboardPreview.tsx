import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Activity, Users, MessageSquare, Shield, TrendingUp, Zap } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const stats = [
  { label: "Membros ativos", value: "12,847", change: "+12%", icon: Users },
  { label: "Mensagens hoje", value: "45,392", change: "+8%", icon: MessageSquare },
  { label: "Ações de moderação", value: "234", change: "-15%", icon: Shield },
];

const activityData = [
  { time: "14:32", user: "Carlos M.", action: "entrou no servidor", type: "join" },
  { time: "14:28", user: "Ana P.", action: "usou comando /help", type: "command" },
  { time: "14:25", user: "Bot", action: "removeu spam de Lucas R.", type: "moderation" },
  { time: "14:20", user: "Marina S.", action: "criou novo canal #anúncios", type: "admin" },
];

export function DashboardPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.8, 1, 1, 0.9]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -10]);

  return (
    <section ref={containerRef} className="py-32 relative overflow-hidden">
      {/* Section header */}
      <div className="container mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="inline-block px-4 py-1.5 text-xs font-medium tracking-wider uppercase rounded-full bg-white/[0.04] text-muted-foreground border border-white/[0.08] mb-6">
            Dashboard
          </span>
          <h2 className="heading-section mb-6">
            Controle total.
            <br />
            <span className="text-gradient">Visualização perfeita.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Monitore tudo em tempo real com um dashboard intuitivo e poderoso. 
            Cada métrica que importa, na palma da sua mão.
          </p>
        </motion.div>
      </div>

      {/* 3D Dashboard mockup */}
      <motion.div 
        style={{ y, opacity, scale }}
        className="container perspective-[2000px]"
      >
        <motion.div 
          style={{ rotateX }}
          className="max-w-5xl mx-auto origin-center"
        >
          <GlassCard className="p-1 overflow-hidden" hover={false}>
            <div className="bg-surface-1 rounded-[1.15rem] p-6 space-y-6">
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03]">
                  <Activity className="w-3.5 h-3.5 text-success" />
                  <span className="text-xs text-muted-foreground">Bot Online</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-4">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <stat.icon className="w-4 h-4 text-muted-foreground" />
                      <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-success' : 'text-muted-foreground'}`}>
                        {stat.change}
                      </span>
                    </div>
                    <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Activity feed */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Atividade</span>
                  </div>
                  <div className="space-y-3">
                    {activityData.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                        className="flex items-center gap-3 text-xs"
                      >
                        <span className="text-muted-foreground w-10">{item.time}</span>
                        <span className="text-foreground/90">{item.user}</span>
                        <span className="text-muted-foreground">{item.action}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Performance</span>
                  </div>
                  {/* Fake chart */}
                  <div className="h-28 flex items-end gap-1.5">
                    {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((height, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.5 + i * 0.05 }}
                        className="flex-1 bg-gradient-to-t from-white/10 to-white/30 rounded-sm"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

    </section>
  );
}
