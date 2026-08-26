import type { Metadata } from 'next';
import './globals.css';
import { sora, ibmPlexSans, jetbrainsMono } from './fonts';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Sistema conversacional para dashboards',
  description: 'Sistema conversacional para crear, consultar y analizar dashboards.',
  keywords: ['dashboard', 'ia', 'mongodb', 'analitica', 'consultas', 'conversacional'],
  icons: {
    icon: [
      { url: '/logo-dashboard.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    shortcut: '/logo-dashboard.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${sora.variable} ${ibmPlexSans.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}

