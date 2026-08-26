/**
 * HTML Sanitization Service
 *
 * Prevents XSS attacks by sanitizing user-generated content.
 * Uses DOMPurify to remove malicious scripts and HTML.
 */

let purify: ReturnType<typeof import('dompurify').default> | null = null;

async function getPurify() {
  if (!purify) {
    const [DOMPurify, { JSDOM }] = await Promise.all([
      import('dompurify').then(m => m.default),
      import('jsdom'),
    ]);
    const window = new JSDOM('').window;
    purify = DOMPurify(window as unknown as any);
  }
  return purify;
}

/**
 * Sanitize HTML to prevent XSS
 * Allows only safe HTML tags and attributes
 */
export async function sanitizeHtml(dirty: string): Promise<string> {
  if (!dirty) return '';

  const p = await getPurify();
  return p.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Strip all HTML tags (plain text only)
 * Use for fields that should never contain HTML
 */
export async function stripHtml(dirty: string): Promise<string> {
  if (!dirty) return '';

  const p = await getPurify();
  return p.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Escape HTML entities
 * Converts special characters to HTML entities
 */
export function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize for use in HTML attributes
 * Removes potentially dangerous characters
 */
export function sanitizeAttribute(dirty: string): string {
  if (!dirty) return '';

  return dirty
    .replace(/[<>"'`=]/g, '')
    .trim();
}

/**
 * Sanitize URL to prevent javascript: and data: schemes
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  const trimmed = url.trim().toLowerCase();

  const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const scheme of dangerousSchemes) {
    if (trimmed.startsWith(scheme)) {
      return '';
    }
  }

  return url.trim();
}

/**
 * Check if string contains potential XSS patterns
 */
export function containsXSS(input: string): boolean {
  if (!input) return false;

  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitize object recursively
 * Strips HTML from all string values
 */
export async function sanitizeObject<T extends Record<string, unknown>>(obj: T): Promise<T> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = await stripHtml(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = await Promise.all(
        value.map((item) =>
          typeof item === 'string' ? stripHtml(item) : item
        )
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = await sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
