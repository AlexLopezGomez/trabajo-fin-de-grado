import Link from 'next/link';

export function LandingCta() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs font-medium text-primary uppercase tracking-widest mb-4">Empieza Hoy</p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white tracking-tight mb-6">
          Construye el futuro de la
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-primary">
            inteligencia de datos
          </span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
          Deja de esperar a que los ingenieros escriban consultas. Dale a cada miembro del equipo el poder de hacer preguntas y obtener insights instantáneos y gobernados de tus datos MongoDB.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-all duration-200 shadow-[0_0_24px_hsl(145,55%,30%,0.4)] hover:shadow-[0_0_36px_hsl(145,55%,30%,0.6)]"
          >
            Comenzar gratis
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/15 hover:border-white/30 text-muted-foreground hover:text-foreground rounded-md transition-all duration-200"
          >
            Solicitar una demo
          </Link>
        </div>

        {/* Social proof strip */}
        <div className="mt-12 flex items-center justify-center gap-6 text-xs text-muted-foreground/60">
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1l1.1 3.3H11L8.2 6.4 9.3 10 6 7.9 2.7 10l1.1-3.6L1 4.3h3.9L6 1z" fill="currentColor" opacity="0.5"/>
            </svg>
            Sin tarjeta de crédito
          </span>
          <span className="w-px h-3 bg-white/15" />
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1l1.1 3.3H11L8.2 6.4 9.3 10 6 7.9 2.7 10l1.1-3.6L1 4.3h3.9L6 1z" fill="currentColor" opacity="0.5"/>
            </svg>
            Configuración en menos de 5 minutos
          </span>
          <span className="w-px h-3 bg-white/15" />
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1l1.1 3.3H11L8.2 6.4 9.3 10 6 7.9 2.7 10l1.1-3.6L1 4.3h3.9L6 1z" fill="currentColor" opacity="0.5"/>
            </svg>
            Soporte empresarial disponible
          </span>
        </div>
      </div>
    </section>
  );
}
