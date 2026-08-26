/**
 * Slack Notification Service
 * 
 * Sends notifications to Slack channels for important events like query approvals.
 * Supports rich message formatting using Slack Block Kit.
 */

import { logger } from '@/lib/utils/logger';

export interface QueryApprovalNotificationParams {
    approvalId: string;
    widgetId: string;
    dashboardId: string;
    dashboardName: string;
    requesterName: string;
    requesterId: string;
    collection: string;
    costScore: number;
    tier: 'green' | 'yellow' | 'red';
    estimatedDocs?: number;
    executionTimeMs?: number;
    suggestions?: string[];
}

export class SlackService {
    /**
     * Send a notification to Slack when a high-impact query needs approval
     */
    static async sendQueryApprovalNotification(
        params: QueryApprovalNotificationParams
    ): Promise<void> {
        const webhookUrl = process.env.SLACK_APPROVALS_WEBHOOK_URL;

        if (!webhookUrl) {
            logger.warn('[Slack] No approvals webhook configured - skipping notification', {
                approvalId: params.approvalId,
            });
            return;
        }

        try {
            const approvalUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/approvals?id=${params.approvalId}`;

            const payload = {
                text: `🔴 High-Impact Query Needs Approval - ${params.dashboardName}`,
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: '🔴 High-Impact Query Needs Approval',
                            emoji: true,
                        },
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Dashboard:*\n${params.dashboardName}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Requester:*\n${params.requesterName}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Collection:*\n${params.collection}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Cost Score:*\n${params.costScore} (${params.tier.toUpperCase()})`,
                            },
                        ],
                    },
                    ...(params.estimatedDocs !== undefined || params.executionTimeMs !== undefined
                        ? [
                            {
                                type: 'section',
                                fields: [
                                    ...(params.estimatedDocs !== undefined
                                        ? [
                                            {
                                                type: 'mrkdwn',
                                                text: `*Estimated Docs to Scan:*\n${params.estimatedDocs.toLocaleString()}`,
                                            },
                                        ]
                                        : []),
                                    ...(params.executionTimeMs !== undefined
                                        ? [
                                            {
                                                type: 'mrkdwn',
                                                text: `*Estimated Time:*\n${params.executionTimeMs}ms`,
                                            },
                                        ]
                                        : []),
                                ],
                            },
                        ]
                        : []),
                    ...(params.suggestions && params.suggestions.length > 0
                        ? [
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `*Optimization Suggestions:*\n${params.suggestions.map((s) => `• ${s}`).join('\n')}`,
                                },
                            },
                        ]
                        : []),
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Query ID:* \`${params.approvalId}\``,
                        },
                    },
                    {
                        type: 'actions',
                        elements: [
                            {
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    text: '👁️ Review & Approve',
                                    emoji: true,
                                },
                                url: approvalUrl,
                                style: 'primary',
                            },
                        ],
                    },
                    {
                        type: 'context',
                        elements: [
                            {
                                type: 'mrkdwn',
                                text: `Approval request created at ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC`,
                            },
                        ],
                    },
                ],
            };

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`Slack API returned ${response.status}: ${response.statusText}`);
            }

            logger.info('[Slack] Query approval notification sent', {
                approvalId: params.approvalId,
                dashboardName: params.dashboardName,
                costScore: params.costScore,
            });
        } catch (error) {
            // Log error but don't throw - Slack failures shouldn't break the approval workflow
            logger.error('[Slack] Failed to send query approval notification', {
                error: error instanceof Error ? error.message : 'Unknown error',
                approvalId: params.approvalId,
                dashboardName: params.dashboardName,
            });
        }
    }

    /**
     * Test the Slack webhook connection
     */
    static async testConnection(): Promise<{ success: boolean; error?: string }> {
        const webhookUrl = process.env.SLACK_APPROVALS_WEBHOOK_URL;

        if (!webhookUrl) {
            return {
                success: false,
                error: 'No Slack webhook URL configured (SLACK_APPROVALS_WEBHOOK_URL)',
            };
        }

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: '✅ Slack connection test successful - Query Approval Notifications are configured!',
                }),
            });

            if (!response.ok) {
                return {
                    success: false,
                    error: `Slack API returned ${response.status}: ${response.statusText}`,
                };
            }

            logger.info('[Slack] Connection test successful');
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}
