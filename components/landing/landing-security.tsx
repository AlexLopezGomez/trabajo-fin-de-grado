const BADGES = [
  {
    title: 'SOC2 Ready',
    desc: 'Arquitectura alineada con los criterios de servicio de confianza SOC2 Tipo II',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2L4 5V11C4 14.98 7.02 18.7 11 20C14.98 18.7 18 14.98 18 11V5L11 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M8 11l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'GDPR Compliant',
    desc: 'Controles de acceso a nivel de campo y auditoría completa para el cumplimiento normativo',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M7 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="11" cy="15" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    title: 'Zero-Trust',
    desc: 'Cada petición verificada — sin confianza implícita dentro ni fuera del perímetro',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M11 7v4l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'ISO 27001',
    desc: 'Prácticas de gestión de seguridad de la información alineadas con estándares internacionales',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 3l7 3v5c0 4-2.8 7.5-7 9-4.2-1.5-7-5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M8 11l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const TESTIMONIALS = [
  {
    quote: "QueryFlow AI redujo el tiempo de análisis de nuestro equipo de días a minutos. El flujo de aprobación nos da tranquilidad ante consultas desbordadas.",
    name: 'Sarah Mitchell',
    role: 'Jefa de Datos, FinCorp',
    initials: 'SM',
  },
  {
    quote: "El sistema RBAC es exactamente lo que necesitábamos para el cumplimiento normativo. Podemos dar acceso a diferentes equipos sin carga adicional para ingeniería.",
    name: 'Carlos Vega',
    role: 'CTO, Logistix',
    initials: 'CV',
  },
  {
    quote: "Por fin, una herramienta de datos que los stakeholders no técnicos pueden usar de verdad. Nuestros product managers la adoran.",
    name: 'Aisha Patel',
    role: 'VP de Ingeniería, Nexum',
    initials: 'AP',
  },
];

export function LandingSecurity() {
  return (
    <section id="security" className="py-24 relative">
      {/* Subtle section divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-3">Seguridad y Confianza</p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            Seguridad empresarial integrada
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-sm">
            La seguridad no es un añadido. Cada capa de QueryFlow AI está diseñada para proteger tus datos más sensibles.
          </p>
        </div>

        {/* Security badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {BADGES.map((b) => (
            <div
              key={b.title}
              className="group p-6 rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-[0_0_20px_hsl(145,55%,30%,0.1)] transition-all duration-300 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                {b.icon}
              </div>
              <h3 className="text-sm font-display font-semibold text-white mb-2">{b.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="p-6 rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="hsl(145,55%,40%)" opacity="0.8">
                    <path d="M7 1l1.5 4H13L9.5 8l1.5 4L7 10l-4 2 1.5-4L1 5h4.5L7 1z"/>
                  </svg>
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
