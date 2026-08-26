export function LandingHowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Conecta',
      description: 'Vincula tu base de datos MongoDB de forma segura. La conexión cifrada no almacena datos sensibles — solo el catálogo de esquemas para el contexto de la IA.',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2C6.68 2 4 4.01 4 6.5V13.5C4 15.99 6.68 18 10 18C13.32 18 16 15.99 16 13.5V6.5C16 4.01 13.32 2 10 2Z" stroke="currentColor" strokeWidth="1.4"/>
          <ellipse cx="10" cy="6.5" rx="6" ry="2.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M4 10C4 12.49 6.68 14.5 10 14.5C13.32 14.5 16 12.49 16 10" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
      ),
    },
    {
      num: '02',
      title: 'Pregunta',
      description: 'Escribe cualquier pregunta en lenguaje natural. La IA genera el pipeline de agregación MongoDB óptimo con validación de seguridad y puntuación de coste.',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 5h14M3 10h10M3 15h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <circle cx="16" cy="15" r="3" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M18.5 17.5L20 19" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      num: '03',
      title: 'Actúa',
      description: 'Obtén gráficos, tablas e insights exportables al instante. Comparte dashboards con tu equipo, configura flujos de aprobación y monitoriza todo en tiempo real.',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="10" width="3" height="8" rx="1" stroke="currentColor" strokeWidth="1.4"/>
          <rect x="8.5" y="6" width="3" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
          <rect x="15" y="2" width="3" height="16" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-3">Cómo funciona</p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            De la pregunta al insight en segundos
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40 pointer-events-none" />

          {steps.map((step) => (
            <div key={step.num} className="relative group">
              <div className="p-6 rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-[0_0_20px_hsl(145,55%,30%,0.15)] transition-all duration-300 h-full">
                {/* Step number + icon row */}
                <div className="flex items-start justify-between mb-5">
                  <span className="text-5xl font-display font-bold text-primary/20 leading-none select-none group-hover:text-primary/30 transition-colors duration-300">
                    {step.num}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors duration-300">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-lg font-display font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
