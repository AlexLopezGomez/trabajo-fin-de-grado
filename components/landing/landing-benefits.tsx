const TECH_LOGOS = [
  'MongoDB', 'Next.js 16', 'OpenAI GPT-4', 'TypeScript 5',
  'Vercel', 'Google OAuth', 'Slack', 'Redis',
  'React 19', 'Tailwind CSS', 'NextAuth v5', 'Zod',
];

export function LandingBenefits() {
  const benefits = [
    {
      title: 'Fiabilidad',
      description: 'Repositorios con caché LRU, verificaciones periódicas de versión de sesión y fallbacks garantizan que tus dashboards estén siempre disponibles.',
      stat: '99.9%',
      statLabel: 'SLA de Disponibilidad',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2v4M10 14v4M2 10h4M14 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
      ),
    },
    {
      title: 'Visibilidad',
      description: 'Auditoría completa de todas las acciones, eventos de seguridad registrados en 16 categorías, alertas Slack y estado de aprobación de consultas en tiempo real.',
      stat: '100%',
      statLabel: 'Cobertura de Auditoría',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
      ),
    },
    {
      title: 'Escalabilidad',
      description: 'Aislamiento por espacios multi-tenant, conexiones MongoDB por espacio y limitación de tasa mediante Upstash Redis o LRU en memoria como alternativa.',
      stat: '∞',
      statLabel: 'Espacios',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 17l4-8 4 5 3-4 3 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Subtle section divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Benefits */}
        <div className="text-center mb-16">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-3">Beneficios</p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            Diseñado para empresas desde el primer día
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="group p-6 rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                {b.icon}
              </div>
              <div className="text-3xl font-display font-bold text-primary mb-0.5">{b.stat}</div>
              <div className="text-xs text-muted-foreground mb-3">{b.statLabel}</div>
              <h3 className="text-base font-display font-semibold text-white mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>

        {/* Tech marquee */}
        <div className="text-center mb-8">
          <p className="text-xs text-muted-foreground/60 uppercase tracking-widest">Tecnologías de primer nivel</p>
        </div>

        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div className="flex animate-marquee whitespace-nowrap">
            {[...TECH_LOGOS, ...TECH_LOGOS].map((logo, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 mx-8 text-sm font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-200 flex-shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
