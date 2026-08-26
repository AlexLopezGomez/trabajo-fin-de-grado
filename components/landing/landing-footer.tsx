import Link from 'next/link';

const LINKS = {
  Producto: [
    { label: 'Constructor de Consultas IA', href: '#features' },
    { label: 'Dashboards', href: '#features' },
    { label: 'Flujos de Aprobación', href: '#features' },
    { label: 'Seguridad', href: '#security' },
  ],
  Soluciones: [
    { label: 'Finanzas y Analítica', href: '#' },
    { label: 'Operaciones', href: '#' },
    { label: 'Cumplimiento normativo', href: '#security' },
    { label: 'SaaS Multi-tenant', href: '#' },
  ],
  Empresa: [
    { label: 'Sobre nosotros', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Empleo', href: '#' },
    { label: 'Contacto', href: '#' },
  ],
  Legal: [
    { label: 'Política de privacidad', href: '#' },
    { label: 'Términos de servicio', href: '#' },
    { label: 'Política de cookies', href: '#' },
    { label: 'DPA', href: '#' },
  ],
};

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 py-16 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shadow-[0_0_10px_hsl(145,55%,30%,0.4)]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L5.5 3.5M5.5 3.5L9 7M5.5 3.5V11M9 11L12 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-display font-semibold text-white text-sm">QueryFlow AI</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
              Plataforma de consultas en lenguaje natural con IA para equipos de datos MongoDB en entornos empresariales.
            </p>
            {/* Social icons */}
            <div className="flex gap-3">
              {[
                {
                  label: 'GitHub',
                  path: 'M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33s1.7.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10.02 10.02 0 0022 12c0-5.52-4.48-10-10-10z',
                },
                {
                  label: 'Twitter/X',
                  path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
                },
                {
                  label: 'LinkedIn',
                  path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
                },
              ].map(({ label, path }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-8 h-8 rounded-md border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/20 transition-all duration-200"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d={path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground/60">
          <p>© 2026 QueryFlow AI. Todos los derechos reservados.</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-primary/70">Todos los sistemas operativos</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
