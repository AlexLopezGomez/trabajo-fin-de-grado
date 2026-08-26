import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guards';
import { QueryAnalyticsPage } from './components/QueryAnalyticsPage';

export const metadata = {
  title: 'Query Analytics | Admin',
  description: 'Monitor query performance and cost trends',
};

export default async function Page() {
  const user = await requireAuth();

  const userRole = user.role.toLowerCase();
  if (userRole !== 'admin' && userRole !== 'supervisor') {
    redirect('/admin');
  }

  return <QueryAnalyticsPage />;
}
