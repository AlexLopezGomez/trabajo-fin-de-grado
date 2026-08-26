/**
 * Validation Constants
 *
 * Centralized validation limits for consistent enforcement across the application.
 * Modify these values to adjust validation rules globally.
 */

export const VALIDATION = {
  // String lengths
  MAX_STRING_LENGTH: 100,
  MAX_SLUG_LENGTH: 100,
  MAX_EMAIL_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_NOTES_LENGTH: 2000,
  MAX_URL_LENGTH: 2048,
  MAX_SEARCH_LENGTH: 200,
  MAX_FILENAME_LENGTH: 255,

  // Pagination
  MAX_PAGE: 1000,
  MAX_LIMIT: 100,
  MAX_PAGE_SIZE: 500,
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  DEFAULT_PAGE_SIZE: 50,

  // Query complexity
  MAX_PIPELINE_STAGES: 100,
  HEAVY_QUERY_THRESHOLD: 5, // Stages that trigger approval for operators
  MAX_QUERY_PIPELINE_STAGES: 20, // From query-schemas.ts

  // Dashboard & Widgets
  MAX_DASHBOARD_NAME_LENGTH: 100,
  MAX_WIDGET_NAME_LENGTH: 100,
  MAX_WIDGETS_PER_DASHBOARD: 50,
  MAX_REFRESH_INTERVAL: 3600, // 1 hour in seconds
  MAX_WIDGET_WIDTH: 12,
  MAX_WIDGET_HEIGHT: 20,

  // Tags
  MAX_TAG_LENGTH: 30,
  MAX_TAGS_PER_ENTITY: 10,

  // Collections and queries
  MAX_COLLECTION_NAME_LENGTH: 100,
  MAX_QUERY_NAME_LENGTH: 100,

  // Security
  MAX_MINUTES_BACK: 1440, // 24 hours in minutes

  // General
  MIN_SEARCH_LENGTH: 2,
  MAX_PERCENTAGE: 100,
} as const;

// Type for validation constant keys
export type ValidationKey = keyof typeof VALIDATION;

// Helper to get validation error message
export function getValidationMessage(
  field: string,
  rule: 'max' | 'min' | 'required',
  limit?: number
): string {
  switch (rule) {
    case 'max':
      return `${field} must not exceed ${limit} characters`;
    case 'min':
      return `${field} must be at least ${limit} characters`;
    case 'required':
      return `${field} is required`;
    default:
      return `Invalid ${field}`;
  }
}