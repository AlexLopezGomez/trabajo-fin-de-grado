import { NextResponse } from 'next/server';
import { SlackService } from '@/lib/services/slack.service';

/**
 * Test endpoint for Slack integration
 * GET /api/test-slack
 */
export async function GET() {
    try {
        const result = await SlackService.testConnection();

        if (result.success) {
            return NextResponse.json(
                {
                    success: true,
                    message: '✅ Slack connection successful! Check your Slack channel for the test message.',
                },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                {
                    success: false,
                    message: '❌ Slack connection failed',
                    error: result.error,
                },
                { status: 500 }
            );
        }
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: '❌ Unexpected error testing Slack connection',
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
