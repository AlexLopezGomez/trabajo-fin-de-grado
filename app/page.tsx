import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { LandingNavbar } from '@/components/landing/landing-navbar';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingHowItWorks } from '@/components/landing/landing-how-it-works';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingBenefits } from '@/components/landing/landing-benefits';
import { LandingSecurity } from '@/components/landing/landing-security';
import { LandingCta } from '@/components/landing/landing-cta';
import { LandingFooter } from '@/components/landing/landing-footer';

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.role === 'viewer' ? '/dashboards' : '/query');
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingBenefits />
        <LandingSecurity />
        {/* <LandingCta /> */}
      </main>
      <LandingFooter />
    </div>
  );
}
