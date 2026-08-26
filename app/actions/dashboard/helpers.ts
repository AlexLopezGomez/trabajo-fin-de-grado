/**
 * Shared helpers for dashboard actions
 */

export function serializeDocument<T>(doc: unknown): T {
    return JSON.parse(JSON.stringify(doc)) as T;
}
