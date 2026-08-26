/**
 * Structured Logging Utility
 *
 * Replaces console.log with environment-aware, structured logging.
 * Integrates with monitoring tools (Sentry, DataDog, etc.) in production.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogMeta {
  [key: string]: unknown;
}

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Core logging function with structured output
 */
function log(level: LogLevel, message: string, meta?: LogMeta): void {
  // Silent in test environment unless explicitly enabled
  if (isTest && !process.env.ENABLE_TEST_LOGS) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logEntry = {
    level,
    timestamp,
    message,
    ...meta,
  };

  if (isDevelopment) {
    // Pretty print in development
    const emoji = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍',
    }[level];

    console.log(`${emoji} [${level.toUpperCase()}] ${message}`);
    if (meta && Object.keys(meta).length > 0) {
      console.log('  Meta:', meta);
    }
  } else {
    // JSON format in production (for log aggregators)
    console.log(JSON.stringify(logEntry));
  }

  // Send to external monitoring in production
  if (level === 'error' && !isDevelopment) {
    // Integration point for Sentry, DataDog, etc.
    // TODO: Add Sentry integration when configured
    // Sentry.captureMessage(message, { level: 'error', extra: meta });
  }
}

/**
 * Log informational messages (general application flow)
 */
export function info(message: string, meta?: LogMeta): void {
  log('info', message, meta);
}

/**
 * Log warnings (non-critical issues)
 */
export function warn(message: string, meta?: LogMeta): void {
  log('warn', message, meta);
}

/**
 * Log errors (critical issues that need attention)
 */
export function error(message: string, err?: Error | unknown, meta?: LogMeta): void {
  const errorMeta: LogMeta = {
    ...meta,
    error: err instanceof Error ? {
      name: err.name,
      message: err.message,
      stack: err.stack,
    } : String(err),
  };

  log('error', message, errorMeta);
}

/**
 * Log debug information (verbose, development only)
 */
export function debug(message: string, meta?: LogMeta): void {
  if (isDevelopment) {
    log('debug', message, meta);
  }
}

/**
 * Log auth-related events
 */
export function auth(event: string, userId?: string, meta?: LogMeta): void {
  info(`[AUTH] ${event}`, {
    ...meta,
    userId,
    category: 'auth',
  });
}

/**
 * Log database operations
 */
export function db(operation: string, collection?: string, meta?: LogMeta): void {
  debug(`[DB] ${operation}`, {
    ...meta,
    collection,
    category: 'database',
  });
}

/**
 * Log API requests
 */
export function api(method: string, path: string, status: number, meta?: LogMeta): void {
  const level = status >= 400 ? 'warn' : 'info';
  log(level, `[API] ${method} ${path} → ${status}`, {
    ...meta,
    method,
    path,
    status,
    category: 'api',
  });
}

/**
 * Log query generation and execution
 */
export function query(message: string, meta?: LogMeta): void {
  info(`[QUERY] ${message}`, {
    ...meta,
    category: 'query',
  });
}

/**
 * Log middleware events
 */
export function middleware(message: string, meta?: LogMeta): void {
  debug(`[MIDDLEWARE] ${message}`, {
    ...meta,
    category: 'middleware',
  });
}

/**
 * Log dashboard operations
 */
export function dashboard(message: string, meta?: LogMeta): void {
  info(`[DASHBOARD] ${message}`, {
    ...meta,
    category: 'dashboard',
  });
}

/**
 * Log audit events (always logged, even in production)
 */
export function audit(action: string, userId: string, meta?: LogMeta): void {
  log('info', `[AUDIT] ${action}`, {
    ...meta,
    userId,
    action,
    category: 'audit',
  });
}

// Export a default logger object
export const logger = {
  info,
  warn,
  error,
  debug,
  auth,
  db,
  api,
  query,
  middleware,
  dashboard,
  audit,
};

// Default export for convenience
export default logger;
