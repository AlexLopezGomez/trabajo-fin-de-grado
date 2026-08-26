'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function LandingHero() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <div className="absolute top-1/3 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/4 -right-40 w-80 h-80 bg-primary/8 rounded-full blur-3xl pointer-events-none animate-pulse-slow" style={{ animationDelay: '1.5s' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        {/* Badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary font-medium mb-8 transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Plataforma Empresarial de IA
        </div>

        {/* Headline */}
        <h1
          className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white leading-[1.05] tracking-tight mb-6 transition-all duration-700 delay-100 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          Transforma el lenguaje natural
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-primary">
            en inteligencia de datos
          </span>
        </h1>

        {/* Sub-headline */}
        <p
          className={`max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed mb-10 transition-all duration-700 delay-200 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          Plataforma empresarial de consultas con IA para MongoDB. Sin SQL, sin código — solo pregunta.
        </p>

        {/* CTAs */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 transition-all duration-700 delay-300 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-all duration-200 shadow-[0_0_20px_hsl(145,55%,30%,0.4)] hover:shadow-[0_0_30px_hsl(145,55%,30%,0.6)]"
          >
            Comenzar gratis
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-6 py-3 border border-white/15 hover:border-white/30 text-muted-foreground hover:text-foreground rounded-md transition-all duration-200 backdrop-blur-sm"
          >
            Ver cómo funciona
          </a>
        </div>

        {/* Dashboard mockup */}
        <div
          className={`relative max-w-4xl mx-auto transition-all duration-1000 delay-500 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <div className="relative rounded-xl border border-white/10 bg-card/80 backdrop-blur-sm overflow-hidden shadow-[0_0_60px_hsl(145,55%,30%,0.15)]">
            {/* Mockup header bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-background/60">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 mx-4">
                <div className="h-5 rounded bg-white/5 flex items-center px-3">
                  <span className="text-xs text-muted-foreground/50">panel.queryflow.ai/dashboards</span>
                </div>
              </div>
            </div>

            {/* Mockup content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Query input mock */}
              <div className="md:col-span-3 bg-background/60 rounded-lg border border-white/8 p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="6" cy="6" r="4" stroke="hsl(145,55%,60%)" strokeWidth="1.2"/>
                    <path d="M9 9L12 12" stroke="hsl(145,55%,60%)" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-sm text-muted-foreground/70">Muéstrame los ingresos totales por región en los últimos 30 días...</span>
                <div className="ml-auto flex-shrink-0">
                  <div className="w-8 h-6 rounded bg-primary/30 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Fake chart card 1 */}
              <div className="bg-background/60 rounded-lg border border-white/8 p-4">
                <div className="text-xs text-muted-foreground mb-1">Total Ingresos</div>
                <div className="text-xl font-display font-bold text-white mb-3">$2.4M</div>
                <div className="flex items-end gap-1 h-12">
                  {[40, 65, 45, 80, 60, 90, 75, 95].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary/40 rounded-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              {/* Fake chart card 2 */}
              <div className="bg-background/60 rounded-lg border border-white/8 p-4">
                <div className="text-xs text-muted-foreground mb-1">Usuarios Activos</div>
                <div className="text-xl font-display font-bold text-white mb-3">12,847</div>
                <div className="flex items-end gap-1 h-12">
                  {[55, 70, 50, 85, 65, 78, 88, 72].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary/25 rounded-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              {/* Fake table card */}
              <div className="bg-background/60 rounded-lg border border-white/8 p-4">
                <div className="text-xs text-muted-foreground mb-3">Top Regiones</div>
                <div className="space-y-2">
                  {[['EMEA', '38%'], ['AMER', '31%'], ['APAC', '21%']].map(([region, pct]) => (
                    <div key={region} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{region}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: pct }} />
                        </div>
                        <span className="text-xs text-white">{pct}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Glow under card */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-primary/20 blur-2xl rounded-full pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
