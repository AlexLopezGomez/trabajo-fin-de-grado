import { Sora, IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';

// Display font - Geometric, modern, sharp edges for headings
export const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['300', '400', '600', '700'],
});

// Body font - Technical, trustworthy, designed for data
export const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600'],
});

// Monospace - Code and data display
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

