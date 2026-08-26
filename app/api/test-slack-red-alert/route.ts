import { NextResponse } from 'next/server';
import { SlackService } from '@/lib/services/slack.service';

/**
 * Test endpoint for Slack RED alert notification (high-impact query)
 * GET /api/test-slack-red-alert
 */
export async function GET() {
    try {
        // Simulate a high-impact query approval with RED tier (cost score 45)
        await SlackService.sendQueryApprovalNotification({
            approvalId: 'test-approval-' + Date.now(),
            widgetId: 'widget-test-123',
            dashboardId: 'dashboard-test-456',
            dashboardName: '🧪 Test Dashboard - High Impact Query',
            requesterName: 'Test User',
            requesterId: 'user-test-789',
            collection: 'users',
            costScore: 45,
            tier: 'red',
            estimatedDocs: 1500000,
            executionTimeMs: 8500,
            suggestions: [
                'Add an index on { email: 1, createdAt: -1 }',
                'Consider adding a filter on status field',
                'Limit the date range to reduce scanned documents'
            ]
        });

        return NextResponse.json(
            {
                success: true,
                message: '✅ RED alert test notification sent! Check your Slack channel.',
                details: {
                    costScore: 45,
                    tier: 'red',
                    estimatedDocs: 1500000,
                    executionTimeMs: 8500
                }
            },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: '❌ Failed to send test notification',
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
