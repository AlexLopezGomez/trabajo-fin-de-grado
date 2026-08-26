'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-background/90 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shadow-[0_0_12px_hsl(145,55%,30%,0.5)]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L5.5 3.5M5.5 3.5L9 7M5.5 3.5V11M9 11L12 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-display font-semibold text-white text-sm tracking-tight">QueryFlow</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {[
              { label: 'Producto', href: '#features' },
              { label: 'Cómo funciona', href: '#how-it-works' },
              { label: 'Seguridad', href: '#security' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 px-3 py-1.5"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-md transition-colors duration-200 shadow-[0_0_12px_hsl(145,55%,30%,0.3)]"
            >
              Comenzar
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className={`block h-0.5 bg-current transition-all duration-200 ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block h-0.5 bg-current transition-all duration-200 ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 bg-current transition-all duration-200 ${mobileOpen ? '-rotate-45 -translate-y-[9px]' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-md border-b border-white/10 px-4 pb-4">
          <nav className="flex flex-col gap-3 pt-3">
            {[
              { label: 'Producto', href: '#features' },
              { label: 'Cómo funciona', href: '#how-it-works' },
              { label: 'Seguridad', href: '#security' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {label}
              </a>
            ))}
            <div className="flex gap-3 pt-2 border-t border-white/10">
              <Link href="/login" className="flex-1 text-center text-sm text-muted-foreground hover:text-foreground py-2">
                Iniciar sesión
              </Link>
              <Link href="/login" className="flex-1 text-center text-sm font-medium bg-primary text-primary-foreground py-2 rounded-md">
                Comenzar
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
