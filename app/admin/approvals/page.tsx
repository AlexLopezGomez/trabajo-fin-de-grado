import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guards';
import { authz } from '@/lib/services/authorization.service';
import ApprovalsClientPage from './components/ApprovalsClientPage';

/**
 * Admin Approvals Page (Server Component)
 * 
 * Securely guards the route on the server side.
 * Only renders the client UI if the user has the required permission.
 */
export default async function AdminApprovalsPage() {
    // 1. Authenticate
    const user = await requireAuth();

    // 2. Authorize
    const capabilities = await authz.getEffectiveCapabilities(user.id);
    const hasPermission =
        capabilities.permissions.includes('view_query_approvals') ||
        capabilities.permissions.includes('*') ||
        capabilities.isAdmin;

    if (!hasPermission) {
        // Redirect to admin home or show 403
        redirect('/admin');
    }

    // 3. Render Client UI
    return <ApprovalsClientPage />;
}
