/**
 * AI Module - Barrel Export
 *
 * This module centralizes AI-related functionality:
 * - Database schema definitions for prompts
 * - Zod validation schemas
 * - System prompt templates
 * - AI provider adapter
 * - Two-stage schema discovery (collection selector + schema builder)
 *
 * Usage:
 * import { MongoPipelineSchema, generateStructuredOutput, AI_CONFIG } from '@/lib/ai';
 * import { selectCollections, buildSchemaForCollections } from '@/lib/ai';
 */

// Schema validation and date utilities
export {
    MongoPipelineSchema,
    type MongoPipelineResult,
    getCurrentDateIso,
    getDaysAgoIso,
} from './schema-provider';

// Prompt templates
export { buildBaseSystemPrompt, buildDynamicSystemPrompt } from './prompt-templates';

// AI Provider Adapter
export {
    generateStructuredOutput,
    generateSecurityClassification,
    isAIEnabled,
    getAIConfig,
    AI_CONFIG,
    type GenerateOptions,
    type GenerateResult,
} from './adapter';

// Generated Schema Catalog (Two-Stage Schema Discovery)
export {
    CATALOG_SUMMARIES,
    FULL_CATALOG,
    QUERYABLE_COLLECTIONS,
    TERM_MAPPINGS,
    TYPE_MISMATCHES,
    DATABASE_INFO,
    type CollectionMetadata,
    type CollectionSummary,
    type IndexInfo,
    type CollectionRelationship,
    type TypeMismatch,
    type JsonSchema,
    type JsonSchemaProperty,
    getCollectionMetadata,
    getMultipleCollectionMetadata,
    searchCollectionsByTags,
    getAllCollectionNames,
    formatCatalogSummariesForPrompt,
    formatSchemaAsDDL,
} from './generated/schema-catalog';

// Collection Selector Agent (Stage 1)
export {
    selectCollections,
    validateCollectionSelection,
    type CollectionSelection,
    type CollectionSelectorOptions,
} from './agents/collection-selector';

// Dynamic Schema Builder (Stage 2)
export {
    buildSchemaForCollections,
    formatSchemaForPrompt,
    buildFullSchema,
    type FocusedSchema,
    type SchemaBuilderOptions,
} from './schema-builder';
