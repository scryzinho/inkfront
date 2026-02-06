import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, CreditCard, Shield, Smartphone, Copy, CheckCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { cn } from "@/lib/utils";

type CheckoutState = "method" | "form" | "pix" | "processing" | "success";
type PaymentMethod = "card" | "pix";

const planFeatures = [
  "Bot dedicado 24/7",
  "Moderação automática",
  "Comandos personalizados ilimitados",
  "Analytics completo",
  "Suporte prioritário",
];

const SIMULATED_PIX_CODE = "00020126580014br.gov.bcb.pix0136a1b2c3d4-e5f6-7890-abcd-ef1234567890520400005303986540529.005802BR5925INKCLOUD TECNOLOGIA LTDA6009SAO PAULO62140510INKCLOUD01630422AC";

export default function Checkout() {
  const navigate = useNavigate();
  const [state, setState] = useState<CheckoutState>("method");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [copied, setCopied] = useState(false);
  const [pixCountdown, setPixCountdown] = useState(3);

  // Auto-approve PIX after 3 seconds
  useEffect(() => {
    if (state === "pix") {
      const interval = setInterval(() => {
        setPixCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setState("success");
            localStorage.setItem("inkcloud_subscribed", "true");
            setTimeout(() => navigate("/setup"), 2000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state, navigate]);

  const handleMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setState(method === "pix" ? "pix" : "form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) return;

    setState("processing");
    
    await new Promise((resolve) => setTimeout(resolve, 2500));
    
    setState("success");
    localStorage.setItem("inkcloud_subscribed", "true");
    
    setTimeout(() => {
      navigate("/setup");
    }, 2000);
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(SIMULATED_PIX_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-2">
              Finalizar assinatura
            </h1>
            <p className="text-muted-foreground text-center mb-12">
              Complete seu pagamento para ativar o inkCloud
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <GlassCard className="p-6">
                <h2 className="text-lg font-semibold mb-6">Resumo do pedido</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">inkCloud Monthly</p>
                      <p className="text-sm text-muted-foreground">Assinatura mensal</p>
                    </div>
                    <p className="font-medium">R$29/mês</p>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <p className="text-muted-foreground">Subtotal</p>
                    <p>R$29,00</p>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="font-semibold">Total</p>
                    <p className="text-xl font-semibold">R$29,00</p>
                  </div>
                </div>

                <ul className="space-y-3">
                  {planFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-success shrink-0" />
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </motion.div>

            {/* Payment Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-3"
            >
              <GlassCard className="p-6 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {/* Payment Method Selection */}
                  {state === "method" && (
                    <motion.div
                      key="method"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      <h2 className="text-lg font-semibold mb-6">Escolha como pagar</h2>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleMethodSelect("pix")}
                          className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all text-left"
                        >
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                            <Smartphone className="w-6 h-6 text-emerald-400" />
                          </div>
                          <h3 className="font-semibold mb-1">Pix</h3>
                          <p className="text-sm text-muted-foreground">Aprovação instantânea</p>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleMethodSelect("card")}
                          className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all text-left"
                        >
                          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                            <CreditCard className="w-6 h-6 text-blue-400" />
                          </div>
                          <h3 className="font-semibold mb-1">Cartão</h3>
                          <p className="text-sm text-muted-foreground">Crédito ou débito</p>
                        </motion.button>
                      </div>

                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
                        <Shield className="w-4 h-4" />
                        <span>Pagamento seguro e criptografado</span>
                      </div>
                    </motion.div>
                  )}

                  {/* PIX Payment */}
                  {state === "pix" && (
                    <motion.div
                      key="pix"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-semibold">Pagar com Pix</h2>
                        <button 
                          onClick={() => setState("method")}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Voltar
                        </button>
                      </div>

                      <div className="text-center space-y-6">
                        {/* QR Code Simulation */}
                        <div className="mx-auto w-48 h-48 bg-white rounded-2xl p-4 relative overflow-hidden">
                          <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0id2hpdGUiLz48ZyBmaWxsPSJibGFjayI+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiLz48cmVjdCB4PSI2MCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjxyZWN0IHg9IjgwIiB5PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iMTEwIiB5PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iMTUwIiB5PSIxMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIi8+PHJlY3QgeD0iMTAiIHk9IjYwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiLz48cmVjdCB4PSI0MCIgeT0iNjAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjxyZWN0IHg9IjcwIiB5PSI2MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iMTAwIiB5PSI2MCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iMTMwIiB5PSI2MCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iMTUwIiB5PSI2MCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iMTgwIiB5PSI2MCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iMTAiIHk9IjgwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiLz48cmVjdCB4PSI1MCIgeT0iODAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjxyZWN0IHg9IjkwIiB5PSI4MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIi8+PHJlY3QgeD0iMTQwIiB5PSI4MCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iMTcwIiB5PSI4MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iMzAiIHk9IjEwMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iNjAiIHk9IjEwMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iMTIwIiB5PSIxMDAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxMCIvPjxyZWN0IHg9IjE2MCIgeT0iMTAwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiLz48cmVjdCB4PSIxMCIgeT0iMTIwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiLz48cmVjdCB4PSI0MCIgeT0iMTIwIiB3aWR0aD0iMjAiIGhlaWdodD0iMTAiLz48cmVjdCB4PSI4MCIgeT0iMTIwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiLz48cmVjdCB4PSIxMTAiIHk9IjEyMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iMTUwIiB5PSIxMjAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjxyZWN0IHg9IjE4MCIgeT0iMTIwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiLz48cmVjdCB4PSIxMCIgeT0iMTUwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiLz48cmVjdCB4PSI2MCIgeT0iMTUwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiLz48cmVjdCB4PSI5MCIgeT0iMTUwIiB3aWR0aD0iMjAiIGhlaWdodD0iMTAiLz48cmVjdCB4PSIxMzAiIHk9IjE1MCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iMTYwIiB5PSIxNTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjxyZWN0IHg9IjYwIiB5PSIxNzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxMCIvPjxyZWN0IHg9IjEwMCIgeT0iMTcwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiLz48cmVjdCB4PSIxNDAiIHk9IjE3MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgeD0iMTgwIiB5PSIxNzAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjxyZWN0IHg9IjcwIiB5PSIxOTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjxyZWN0IHg9IjExMCIgeT0iMTkwIiB3aWR0aD0iMzAiIGhlaWdodD0iMTAiLz48cmVjdCB4PSIxNjAiIHk9IjE5MCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjEwIi8+PC9nPjwvc3ZnPg==')] bg-contain bg-center bg-no-repeat" />
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Ou copie o código Pix</p>
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                            <code className="flex-1 text-xs text-muted-foreground truncate">
                              {SIMULATED_PIX_CODE.slice(0, 50)}...
                            </code>
                            <button
                              onClick={copyPixCode}
                              className="shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              {copied ? (
                                <CheckCircle className="w-4 h-4 text-success" />
                              ) : (
                                <Copy className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="pt-4">
                          <div className="flex items-center justify-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                            <span className="text-sm">
                              Aguardando pagamento... <span className="text-muted-foreground">({pixCountdown}s)</span>
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            O pagamento será confirmado automaticamente
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Card Form */}
                  {state === "form" && (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-muted-foreground" />
                          <h2 className="text-lg font-semibold">Pagar com cartão</h2>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setState("method")}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Voltar
                        </button>
                      </div>

                      <GlassInput
                        label="Número do cartão"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        maxLength={19}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <GlassInput
                          label="Validade"
                          placeholder="MM/AA"
                          value={expiry}
                          onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                          maxLength={5}
                        />
                        <GlassInput
                          label="CVC"
                          placeholder="123"
                          value={cvc}
                          onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          maxLength={4}
                          type="password"
                        />
                      </div>

                      <GlassInput
                        label="Nome no cartão"
                        placeholder="Como aparece no cartão"
                      />

                      <div className="pt-4 border-t border-white/5">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="relative mt-0.5">
                            <input
                              type="checkbox"
                              checked={termsAccepted}
                              onChange={(e) => setTermsAccepted(e.target.checked)}
                              className="sr-only"
                            />
                            <div className={cn(
                              "w-5 h-5 rounded border transition-all",
                              termsAccepted 
                                ? "bg-white border-white" 
                                : "border-white/20 group-hover:border-white/40"
                            )}>
                              {termsAccepted && (
                                <Check className="w-full h-full p-0.5 text-background" />
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            Li e aceito os{" "}
                            <a href="#" className="text-foreground underline underline-offset-2">
                              Termos de Uso
                            </a>{" "}
                            e a{" "}
                            <a href="#" className="text-foreground underline underline-offset-2">
                              Política de Privacidade
                            </a>
                          </span>
                        </label>
                      </div>

                      <GlassButton
                        type="submit"
                        variant="primary"
                        className="w-full"
                        disabled={!termsAccepted}
                      >
                        Confirmar pagamento
                      </GlassButton>

                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Shield className="w-4 h-4" />
                        <span>Pagamento seguro e criptografado</span>
                      </div>
                    </motion.form>
                  )}

                  {state === "processing" && (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-16 text-center"
                    >
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-6 text-muted-foreground" />
                      <h3 className="text-xl font-semibold mb-2">Processando pagamento...</h3>
                      <p className="text-muted-foreground">Por favor, aguarde enquanto validamos sua transação.</p>
                    </motion.div>
                  )}

                  {state === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-16 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6"
                      >
                        <Check className="w-8 h-8 text-success" />
                      </motion.div>
                      <h3 className="text-xl font-semibold mb-2">Pagamento confirmado!</h3>
                      <p className="text-muted-foreground">Redirecionando para configuração...</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
