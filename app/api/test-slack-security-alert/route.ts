import { NextResponse } from 'next/server';

/**
 * Test endpoint for Slack CRITICAL security alert
 * GET /api/test-slack-security-alert
 */
export async function GET() {
    try {
        const webhookUrl = process.env.SLACK_SECURITY_WEBHOOK;

        if (!webhookUrl) {
            return NextResponse.json(
                {
                    success: false,
                    message: '❌ SLACK_SECURITY_WEBHOOK not configured',
                    help: 'Add SLACK_SECURITY_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL to your .env file'
                },
                { status: 400 }
            );
        }

        // Simulate a CRITICAL security event
        const testEvent = {
            type: 'PRIVILEGE_ESCALATION',
            severity: 'CRITICAL',
            email: 'test.user@example.com',
            userId: 'test-user-123',
            role: 'viewer',
            action: 'ATTEMPTED_ADMIN_ACCESS',
            resource: '/admin/users',
            resourceType: 'user',
            ipAddress: '192.168.1.100',
            timestamp: new Date().toISOString(),
            details: {
                attemptedRole: 'admin',
                currentRole: 'viewer',
                reason: 'Test security alert from API endpoint',
                pattern: 'SUSPICIOUS_PRIVILEGE_CHANGE'
            }
        };

        const payload = {
            text: `🔴 Security Alert: ${testEvent.type}`,
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: `🔴 ${testEvent.severity} Security Event`,
                    },
                },
                {
                    type: 'section',
                    fields: [
                        { type: 'mrkdwn', text: `*Type:*\n${testEvent.type}` },
                        { type: 'mrkdwn', text: `*Action:*\n${testEvent.action}` },
                        { type: 'mrkdwn', text: `*User:*\n${testEvent.email}` },
                        { type: 'mrkdwn', text: `*Role:*\n${testEvent.role}` },
                        { type: 'mrkdwn', text: `*IP:*\n${testEvent.ipAddress}` },
                        { type: 'mrkdwn', text: `*Time:*\n${testEvent.timestamp}` },
                    ],
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Resource:* ${testEvent.resource}\n*Type:* ${testEvent.resourceType}`,
                    },
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Details:*\n\`\`\`${JSON.stringify(testEvent.details, null, 2)}\`\`\``,
                    },
                },
            ],
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: '❌ Failed to send Slack notification',
                    error: `Slack API returned ${response.status}: ${response.statusText}`,
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: '✅ CRITICAL security alert sent! Check your Slack channel.',
                details: {
                    type: testEvent.type,
                    severity: testEvent.severity,
                    user: testEvent.email,
                    action: testEvent.action
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
