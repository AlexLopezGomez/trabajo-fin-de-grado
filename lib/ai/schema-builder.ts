/**
 * Dynamic Schema Builder - Stage 2 of Two-Stage Schema Discovery
 *
 * Builds focused database schemas for selected collections.
 * Fetches full schemas, sample documents, and index information.
 *
 * Flow:
 * 1. Collection selector identifies relevant collections
 * 2. This builder fetches detailed schemas for those collections
 * 3. Returns focused context (~40-60 fields instead of 2,000)
 * 4. Query builder uses this focused schema to generate pipeline
 *
 * Token savings: ~5,500 tokens vs 50K+ for all collections
 */

import {
  getMultipleCollectionMetadata,
  type CollectionMetadata,
  DATABASE_INFO,
  TYPE_MISMATCHES,
  QUERYABLE_COLLECTIONS,
  formatSchemaAsDDL,
} from './generated/schema-catalog';
import { logger } from '@/lib/utils/logger';
import { getSampleDocuments } from '@/lib/db/sample-documents';

// ============================================
// Type Definitions
// ============================================

/**
 * Focused schema for query generation
 * Contains only selected collections with full details
 */
export interface FocusedSchema {
  collections: CollectionMetadata[];
  currentDate: string;
  relationshipHints: string[];
  queryRules: string[];
  totalFields: number;
  estimatedTokens: number;
}

// ============================================
// Schema Builder
// ============================================

export interface SchemaBuilderOptions {
  /**
   * Whether to fetch fresh sample documents from database
   * If false, uses cached samples from catalog (default: false)
   */
  fetchFreshSamples?: boolean;

  /**
   * Number of sample documents per collection (default: 2)
   */
  samplesPerCollection?: number;

  /**
   * Whether to include relationship hints in schema (default: true)
   */
  includeRelationships?: boolean;

  /**
   * Whether to include index information (default: true)
   */
  includeIndexes?: boolean;
}

/**
 * Build focused schema for selected collections
 *
 * @param collectionNames - Array of collection names from Stage 1
 * @param options - Configuration options
 * @returns Focused schema with only selected collections
 *
 * @example
 * ```ts
 * const schema = await buildSchemaForCollections(['users', 'wallets']);
 * console.log(schema.collections); // Only users and wallets
 * console.log(schema.totalFields); // ~40 fields instead of 2,000
 * ```
 */
export async function buildSchemaForCollections(
  collectionNames: string[],
  options: SchemaBuilderOptions = {}
): Promise<FocusedSchema> {
  const {
    fetchFreshSamples = false,
    samplesPerCollection = 2,
    includeRelationships = true,
    includeIndexes = true,
  } = options;

  logger.debug('🔨 [SCHEMA BUILDER] Starting Stage 2: Building focused schema', {
    collections: collectionNames,
    fetchFreshSamples,
    samplesPerCollection,
  });

  const startTime = Date.now();

  try {
    // Fetch metadata from catalog
    let collections = getMultipleCollectionMetadata(collectionNames);

    if (collections.length === 0) {
      throw new Error('No valid collections found in catalog');
    }

    // Optionally fetch fresh sample documents from database
    if (fetchFreshSamples) {
      logger.debug('[SCHEMA BUILDER] Fetching fresh sample documents from database');
      collections = await Promise.all(
        collections.map(async (collection) => {
          try {
            const samples = await getSampleDocuments(collection.name, samplesPerCollection);
            return {
              ...collection,
              sampleDocuments: samples.length > 0 ? samples : collection.sampleDocuments,
            };
          } catch (error) {
            logger.warn(
              `Failed to fetch samples for ${collection.name}, using cached samples`,
              { error: error instanceof Error ? error.message : 'Unknown' }
            );
            return collection;
          }
        })
      );
    }

    // Remove indexes if not needed
    if (!includeIndexes) {
      collections = collections.map((c) => ({ ...c, indexes: [] }));
    }

    // Build relationship hints
    const relationshipHints: string[] = [];
    if (includeRelationships) {
      collections.forEach((collection) => {
        collection.relationships.forEach((rel) => {
          relationshipHints.push(
            `${collection.name}.${rel.localField} → ${rel.foreignCollection}.${rel.foreignField} (${rel.cardinality}): ${rel.description}`
          );
        });
      });
    }

    // Get current date for time-based queries
    const currentDate = new Date().toISOString();

    // Calculate statistics
    const totalFields = collections.reduce(
      (sum, c) => sum + Object.keys(c.schema?.properties || {}).length,
      0
    );
    const estimatedTokens = estimateSchemaTokens(collections, relationshipHints);

    const buildTime = Date.now() - startTime;

    logger.debug('✅ [SCHEMA BUILDER] Stage 2 completed', {
      collectionsCount: collections.length,
      totalFields,
      estimatedTokens,
      relationshipHints: relationshipHints.length,
      buildTimeMs: buildTime,
    });

    return {
      collections,
      currentDate,
      relationshipHints,
      queryRules: getQueryRules(),
      totalFields,
      estimatedTokens,
    };
  } catch (error) {
    const buildTime = Date.now() - startTime;

    console.error('❌ [SCHEMA BUILDER] Stage 2 failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      buildTimeMs: buildTime,
    });

    throw error;
  }
}

// ============================================
// Schema Formatting for LLM
// ============================================

/**
 * Format focused schema for LLM prompt
 * Generates a concise, well-structured schema document
 *
 * @param focusedSchema - Focused schema from buildSchemaForCollections
 * @returns Formatted string ready for LLM prompt
 */
export function formatSchemaForPrompt(focusedSchema: FocusedSchema): string {
  let output = `## Database Information
Name: ${DATABASE_INFO.name}
Description: ${DATABASE_INFO.description}
Current Date: ${focusedSchema.currentDate} (use for time-based queries)

`;

  // Render each collection in compact DDL format
  focusedSchema.collections.forEach((collection) => {
    output += formatSchemaAsDDL(collection);
    output += '\n\n';
  });

  // Add relationship hints
  if (focusedSchema.relationshipHints.length > 0) {
    output += `## Relationships Between Collections\n`;
    focusedSchema.relationshipHints.forEach((hint) => {
      output += `- ${hint}\n`;
    });
    output += '\n';
  }

  // Add query rules
  output += `## Query Generation Rules\n`;
  focusedSchema.queryRules.forEach((rule) => {
    output += `- ${rule}\n`;
  });

  return output;
}

// ============================================
// Query Rules
// ============================================

/**
 * Get query generation rules for LLM
 * These are always included regardless of selected collections
 */
function getQueryRules(): string[] {
  const rules: string[] = [
    'Always use $match as early as possible to filter documents',
    'Use $project to select only needed fields',
    'Add $limit to prevent returning too many documents (default: 100)',
    'Use $lookup for joins between collections',
    'Use $group for aggregations',
    'Prefer indexed fields in $match when possible',
    'For time-based queries, use the current date provided above',
    'PROHIBITED stages: $out, $merge, $planCacheStats',
    'For "top N" queries, use $sort + $limit',
    'For counts, use $group with $sum',
    'CRITICAL — football team names: ALWAYS filter by the STRING field "team_name" (NOT "team_id" which is numeric). team_name values differ between old seasons (CSV short names) and new seasons (official Sofascore names) — use $in with ALL known variants. Known pairs (old CSV → official Sofascore): Athletic Bilbao=["Ath Bilbao","Athletic Club"], Atletico Madrid=["Ath Madrid","Club Atlético de Madrid"], Barcelona=["Barcelona","FC Barcelona"], Espanyol=["Espanol","RCD Espanyol de Barcelona"], Celta=["Celta","RC Celta de Vigo"], Betis=["Betis","Real Betis Balompié"], Cadiz=["Cadiz","Cádiz CF"], Rayo=["Vallecano","Rayo Vallecano de Madrid"], Real Sociedad=["Sociedad","Real Sociedad de Fútbol"], Levante=["Levante","Levante UD"], Getafe=["Getafe","Getafe CF"], Girona=["Girona","Girona FC"], Granada=["Granada","Granada CF"], Mallorca=["Mallorca","RCD Mallorca"], Osasuna=["Osasuna","CA Osasuna"], Alaves=["Alaves","Deportivo Alavés"], Valladolid=["Valladolid","Real Valladolid CF"], Villarreal=["Villarreal","Villarreal CF"], Valencia=["Valencia","Valencia CF"], Sevilla=["Sevilla","Sevilla FC"]. Correct example: { "team_name": { "$in": ["Ath Madrid", "Club Atlético de Madrid"] } }. WRONG: { "team_id": { "$in": [...string values...] } }. NEVER put string name values in team_id. NEVER use $regex for team names — accents break matching.',
    'CRITICAL — $project before $sort: when you use $sort after $project, make sure all fields used in $sort are included in $project. If you need to sort by season_year, include it in $project.',
    'CRITICAL — NEVER use $lookup between football_teams and football_standings via team_id: the _id field in football_teams is ObjectId but team_id in football_standings is a Number — the join will always return 0 results. Instead, always query football_standings directly and group/filter by team_name.',
    'CRITICAL — ALWAYS add league filter: when querying football_standings for La Liga data, ALWAYS include {"league": "Spain La Liga"} in the $match stage. Without this filter, results include both La Liga AND La Liga 2 data mixed together.',
    'CRITICAL — field-to-field comparison: NEVER use {"fieldA": {"$gt": "$fieldB"}} in $match — MongoDB treats "$fieldB" as a literal string, always 0 results. ALWAYS use $expr. This rule applies EVERYWHERE including inside a $match that comes AFTER a $lookup + $unwind. Correct example after $lookup: { "$match": { "$expr": { "$gt": ["$match_details.away_score", "$match_details.home_score"] } } }. Wrong: { "$match": { "match_details.away_score": { "$gt": "$match_details.home_score" } } }.',
    'CRITICAL — comeback/remontada query pattern: To find matches where the home team was LOSING at halftime but WON at full time, use: { "$match": { "$expr": { "$and": [ { "$lt": ["$half_time_home_score", "$half_time_away_score"] }, { "$gt": ["$home_score", "$away_score"] }, { "$ne": ["$half_time_home_score", null] } ] } } }. NEVER compare half_time_home_score with home_score — that makes no sense.',
    'CRITICAL — player names: football_player_stats has player_id (number) but NO name field. To display player names, always add a $lookup to football_players using localField: "player_id", foreignField: "sofascore_id" (NOT "_id"). Then extract the name with $addFields: { player_name: { "$arrayElemAt": ["$player.name", 0] } }. Always project player_name instead of player_id in the final $project.',
    'CRITICAL — NEVER use $unionWith (it is blocked). For home+away combined stats per team (e.g. total goals, total xG across all matches regardless of venue), use this exact pattern: (1) $match to filter, (2) $facet where EACH VALUE MUST BE AN ARRAY of pipeline stages — { "$facet": { "home": [ { "$group": { "_id": "$home_team_name", "goals": { "$sum": "$home_score" }, "xg": { "$sum": "$home_xg" } } } ], "away": [ { "$group": { "_id": "$away_team_name", "goals": { "$sum": "$away_score" }, "xg": { "$sum": "$away_xg" } } } ] } }, (3) { "$project": { "all": { "$concatArrays": ["$home", "$away"] } } }, (4) { "$unwind": "$all" }, (5) { "$replaceRoot": { "newRoot": "$all" } }, (6) { "$group": { "_id": "$_id", "total_goals": { "$sum": "$goals" }, "total_xg": { "$sum": "$xg" } } }, (7) $addFields for derived metrics, (8) $sort, (9) $limit. IMPORTANT: $facet sub-pipelines MUST be arrays ([ ... ]), never plain objects.',
    'CRITICAL — xG queries: NEVER use football_team_stats for xG analysis (total_xg is NULL in all 40 documents). Always use football_matches.home_xg and away_xg. These fields are available for seasons 22/23, 23/24, 24/25 in La Liga. Filter with { "home_xg": { "$ne": null } }.',
    'CRITICAL — cards/fouls/shots per season: Use football_matches fields (home_yellow_cards, away_yellow_cards, home_red_cards, away_red_cards, home_fouls, away_fouls, home_shots, away_shots). football_player_stats.yellow_cards is 0 in ALL documents — never use it for aggregated discipline/shot stats.',
    'CRITICAL — home vs away breakdown: football_standings only has TOTAL season stats (not split home/away). For home vs away points, goals, or wins comparison, use football_matches and identify side via home_team_name/away_team_name fields.',
    'CRITICAL — odds + standings join: football_odds links to football_matches via match_id. To correlate odds with final standings, join football_odds → football_matches (on match_id = sofascore_id) to get home_team_name and season, then join to football_standings by team_name and season. Never join football_odds directly to football_standings.',
  ];

  // Dynamic rules from type mismatches
  for (const m of TYPE_MISMATCHES) {
    rules.push(
      `${m.collection}.${m.field} is ${m.actualType} but references ${m.relatedCollection}.${m.relatedField} (${m.expectedType}). Use $toString in $lookup.`
    );
  }

  return rules;
}

// ============================================
// Token Estimation
// ============================================

/**
 * Estimate token count for schema
 * Rough estimate: 1 token ≈ 4 characters
 */
function estimateSchemaTokens(
  collections: CollectionMetadata[],
  relationshipHints: string[]
): number {
  let charCount = 0;

  // Collection schemas
  collections.forEach((c) => {
    charCount += JSON.stringify(c.schema).length;
    charCount += c.description.length;
    charCount += JSON.stringify(c.sampleDocuments).length;
    charCount += c.indexes.length * 50;
  });

  // Relationship hints
  charCount += relationshipHints.join('').length;

  // Query rules
  charCount += getQueryRules().join('').length;

  // Convert to tokens (rough estimate: 1 token ≈ 4 chars)
  return Math.ceil(charCount / 4);
}

// ============================================
// Backward Compatibility
// ============================================

/**
 * Build legacy full schema for backward compatibility
 * This mimics the old getDatabaseSchema() function
 *
 * @deprecated Use buildSchemaForCollections with selectCollections instead
 */
export async function buildFullSchema(): Promise<string> {
  const focusedSchema = await buildSchemaForCollections(QUERYABLE_COLLECTIONS.slice(0, 10));
  return formatSchemaForPrompt(focusedSchema);
}
