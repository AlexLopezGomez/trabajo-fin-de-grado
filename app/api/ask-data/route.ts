import { NextRequest, NextResponse } from 'next/server';
import { getCachedResponse, setCachedResponse } from '@/lib/utils/cache';
import { processMockQuery } from '@/lib/testing/mock-data';
import { QueryRequest, QueryResponse } from '@/types';
import { requireAuth, AuthError, logActionWithContext } from '@/lib/auth/guards';
import { checkQueryRateLimit, getRateLimitErrorMessage } from '@/lib/security/rate-limit';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/ask-data
 * 
 * AI Query Engine endpoint
 * - Receives natural language questions
 * - Checks cache first
 * - Uses AI to translate to MongoDB aggregation (mock for now)
 * - Returns structured data response
 */
export async function POST(request: NextRequest) {
  try {
    // 1) Require authentication
    const user = await requireAuth();

    // 2) Per-user rate limiting
    const rateLimitResult = await checkQueryRateLimit(user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: getRateLimitErrorMessage(rateLimitResult.reset),
          data: [],
          query: '',
          executionTime: 0,
          fromCache: false,
          totalRecords: 0,
        } as QueryResponse,
        { status: 429 }
      );
    }

    const body: QueryRequest = await request.json();
    const { question, limit = 100 } = body;

    // Validate input
    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'La pregunta es requerida',
          data: [],
          query: '',
          executionTime: 0,
          fromCache: false,
          totalRecords: 0,
        } as QueryResponse,
        { status: 400 }
      );
    }

    // 3) Audit log (non-blocking intent; failures are swallowed inside helper)
    logActionWithContext('query_submitted', {
      question: question.substring(0, 100),
      limit,
    });

    // Check cache first
    const cachedResponse = getCachedResponse(question);
    if (cachedResponse) {
      logger.info('[ASK_DATA] Cache hit', {
        questionPreview: question.substring(0, 50),
        userId: user.id,
      });
      return NextResponse.json(cachedResponse);
    }

    logger.info('[ASK_DATA] Cache miss', {
      questionPreview: question.substring(0, 50),
      userId: user.id,
    });

    // Process the query (using mock for now)
    // TODO: Replace with real OpenAI + MongoDB implementation
    const result = await processMockQuery(question);

    // Apply limit if specified
    if (result.data.length > limit) {
      result.data = result.data.slice(0, limit);
      result.totalRecords = result.data.length;
    }

    // Cache the successful response
    if (result.success) {
      setCachedResponse(question, result);
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          data: [],
          query: '',
          executionTime: 0,
          fromCache: false,
          totalRecords: 0,
        } as QueryResponse,
        { status: error.code === 'UNAUTHENTICATED' ? 401 : 403 }
      );
    }

    logger.error('[ASK_DATA] API Error', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor',
        data: [],
        query: '',
        executionTime: 0,
        fromCache: false,
        totalRecords: 0,
      } as QueryResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/ask-data
 * Health check and info endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '1.0.0',
    engine: 'mock', // Will be 'openai' when implemented
    message: 'Data Intelligence API is running',
    endpoints: {
      ask: 'POST /api/ask-data',
    },
  });
}

