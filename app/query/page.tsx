'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';
import { AIQueryBuilder } from '@/components/dashboard/ai-query-builder';

export default function QueryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated' && session?.user?.role === 'viewer') {
      router.push('/dashboards');
    }
  }, [status, session?.user?.role, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          'radial-gradient(ellipse 90% 55% at 50% 0%, hsl(0 0% 9%), hsl(0 0% 4%) 65%)',
      }}
    >
      <div className="fixed inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="fixed inset-0 bg-noise pointer-events-none" />
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
      <div className="fixed inset-0 bg-radial-glow-amber pointer-events-none" />
      <div className="fixed top-1/3 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="fixed bottom-1/4 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 flex flex-col flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="pt-8 pb-6"><DashboardHeader /></div>

        {/* Optically centered block — pb-20 nudges content slightly above mathematical center */}
        <div className="flex-1 flex flex-col items-center justify-center pb-20">
          <div className="text-center space-y-8 mb-16 w-full">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white leading-[1.05] tracking-tight">
              Consulta tus datos con
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-primary">
                Inteligencia Artificial
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg font-light text-muted-foreground/80 leading-relaxed">
              Pregunta en lenguaje natural. La IA genera y ejecuta queries de MongoDB automáticamente.
            </p>
          </div>
          <div className="max-w-3xl mx-auto w-full">
            <AIQueryBuilder />
          </div>
        </div>

        <footer className="py-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p className="font-display">© 2026 Sistema conversacional para dashboards.</p>
            <span className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <div className="absolute inset-0 w-2 h-2 bg-primary rounded-full animate-ping opacity-75" />
              </div>
              <span className="text-primary font-medium">Sistema Activo</span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
