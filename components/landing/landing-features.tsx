export function LandingFeatures() {
  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-3">Funcionalidades</p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            Todo lo que tu equipo necesita
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-sm">
            Una plataforma completa para consultar, visualizar y gestionar tus datos MongoDB — potenciada por IA.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Large feature card */}
          <div className="lg:col-span-2 group p-8 rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm hover:border-primary/40 hover:shadow-[0_0_30px_hsl(145,55%,30%,0.2)] transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary mb-6">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M3 11H19M11 3L19 11L11 19" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-3">Constructor de Consultas IA</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Escribe cualquier pregunta en lenguaje natural y obtén un pipeline de agregación MongoDB optimizado al instante. Nuestro motor GPT-4 entiende tu esquema, valida los pipelines con Zod y bloquea 130+ patrones de inyección antes de la ejecución.
            </p>
            {/* Mini code mockup */}
            <div className="rounded-lg bg-background/60 border border-white/8 p-4 font-mono text-xs">
              <div className="text-muted-foreground/50 mb-2">// Pipeline generado</div>
              <div><span className="text-primary/80">{'['}</span></div>
              <div className="pl-4"><span className="text-blue-400/70">{'{ $match: '}</span><span className="text-yellow-400/70">{'{ region: "EMEA" }'}</span><span className="text-blue-400/70">{' },'}</span></div>
              <div className="pl-4"><span className="text-blue-400/70">{'{ $group: { _id: "$month",'}</span></div>
              <div className="pl-8"><span className="text-green-400/70">{'total: { $sum: "$revenue" } } }'}</span></div>
              <div><span className="text-primary/80">{']'}</span></div>
            </div>
          </div>

          {/* RBAC card */}
          <div className="group p-6 rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm hover:border-primary/40 hover:shadow-[0_0_20px_hsl(145,55%,30%,0.15)] transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary mb-5">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M3 15c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M13 10l1.5 1.5L16 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-base font-display font-semibold text-white mb-2">RBAC y Multi-Tenant</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cuatro roles integrados (admin, supervisor, operator, viewer) más roles personalizados con permisos granulares. Espacios de nombres aislados para cada equipo.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {['admin', 'supervisor', 'operator', 'viewer'].map((r) => (
                <span key={r} className="text-xs px-2 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary/80">{r}</span>
              ))}
            </div>
          </div>

          {/* Approvals card */}
          <div className="group p-6 rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm hover:border-primary/40 hover:shadow-[0_0_20px_hsl(145,55%,30%,0.15)] transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary mb-5">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L10.5 7H15.5L11.5 10L13 15L9 12L5 15L6.5 10L2.5 7H7.5L9 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-base font-display font-semibold text-white mb-2">Flujos de Aprobación</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Las consultas costosas (nivel rojo) se bloquean automáticamente para revisión del supervisor. Notificaciones Slack, auditoría completa y puntuación de coste por niveles (0–100).
            </p>
            <div className="mt-4 flex items-center gap-2">
              {[['Green', 'bg-emerald-500/30 text-emerald-400'], ['Yellow', 'bg-yellow-500/30 text-yellow-400'], ['Red', 'bg-red-500/30 text-red-400']].map(([label, cls]) => (
                <span key={label} className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
              ))}
            </div>
          </div>

          {/* Dashboards card */}
          <div className="group p-6 rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm hover:border-primary/40 hover:shadow-[0_0_20px_hsl(145,55%,30%,0.15)] transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary mb-5">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
            </div>
            <h3 className="text-base font-display font-semibold text-white mb-2">Dashboards en Tiempo Real</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Crea dashboards compartibles con widgets, gráficos y tablas. Datos en vivo, layouts responsivos y controles de visibilidad por rol.
            </p>
          </div>

          {/* Security card */}
          <div className="group p-6 rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm hover:border-primary/40 hover:shadow-[0_0_20px_hsl(145,55%,30%,0.15)] transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary mb-5">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L3 5V10C3 13.31 5.69 16 9 16C12.31 16 15 13.31 15 10V5L9 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                <path d="M6.5 9L8 10.5L11.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-base font-display font-semibold text-white mb-2">Capas de Seguridad</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Detección de 130+ patrones de inyección, 9 verificaciones de anomalías, validación de pipelines con Zod, operadores de escritura bloqueados y registro completo de eventos de seguridad.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-primary/70">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              130+ patrones bloqueados
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
