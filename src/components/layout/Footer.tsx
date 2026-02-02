import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const footerLinks = {
  produto: [
    { label: "Recursos", href: "#recursos" },
    { label: "Preços", href: "#precos" },
    { label: "FAQ", href: "#faq" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  suporte: [
    { label: "Documentação", href: "#" },
    { label: "Status", href: "#" },
    { label: "Contato", href: "#" },
  ],
  legal: [
    { label: "Termos de Uso", href: "#" },
    { label: "Privacidade", href: "#" },
    { label: "Cookies", href: "#" },
  ],
  social: [
    { label: "Discord", href: "#" },
    { label: "Twitter", href: "#" },
    { label: "GitHub", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-background">
      <div className="container">
        {/* Main footer */}
        <div className="py-16 md:py-20">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
            {/* Brand */}
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-3 mb-6 group">
                <div className="w-12 h-12 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300">
                  <img src="/logo.png" alt="inkCloud" className="w-12 h-12 object-contain" />
                </div>
                <span className="text-xl font-semibold tracking-tight">
                  inkCloud
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
                A plataforma mais avançada para gerenciar bots Discord com 
                interface intuitiva e recursos profissionais.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>Todos os sistemas operacionais</span>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-sm font-semibold mb-5">Produto</h4>
              <ul className="space-y-3">
                {footerLinks.produto.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Links */}
            <div>
              <h4 className="text-sm font-semibold mb-5">Suporte</h4>
              <ul className="space-y-3">
                {footerLinks.suporte.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-sm font-semibold mb-5">Legal</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social Links */}
            <div>
              <h4 className="text-sm font-semibold mb-5">Social</h4>
              <ul className="space-y-3">
                {footerLinks.social.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} inkCloud. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Português (BR)
            </a>
            <span className="text-xs text-muted-foreground">
              Feito com precisão no Brasil
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
