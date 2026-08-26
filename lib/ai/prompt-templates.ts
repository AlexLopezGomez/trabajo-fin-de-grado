/**
 * AI Prompt Templates
 * 
 * Contains the system prompts and instructions for AI query generation.
 * Separated from schema-provider.ts to allow independent prompt tuning.
 */

import { getCurrentDateIso, getDaysAgoIso } from './schema-provider';
import { TERM_MAPPINGS, TYPE_MISMATCHES } from './generated/schema-catalog';

// ============================================
// Query Rules & Best Practices
// ============================================

function buildQueryRules(): string {
  let rules = `
## QUERY AUTHORING RULES (CRITICAL)

### CRITICAL MONGODB ERROR TO AVOID
**NEVER USE $elemMatch IN $project, $addFields, OR ANY AGGREGATION EXPRESSION!**

$elemMatch ONLY works in $match stage:
- ALLOWED: { "$match": { "array": { "$elemMatch": { "field": "value" } } } }
- FORBIDDEN: { "$project": { "item": { "$elemMatch": { "field": "value" } } } }
- FORBIDDEN: { "$addFields": { "item": { "$elemMatch": { "field": "value" } } } }

**To filter/extract array elements in $project or $addFields, use $filter:**
{ "$filter": { "input": "$array", "as": "item", "cond": { "$eq": ["$$item.field", "value"] } } }

### Security - READ ONLY
- NEVER use $out, $merge, $delete, $update or any write operation.
- ALWAYS include $limit (max 100 by default) for result set management.

### MongoDB Best Practices
1. Ensure proper use of MongoDB operators ($eq, $gt, $lt, $gte, $lte, $ne, $in, $nin) and data types (ObjectId, ISODate, Decimal128).
2. For complex queries, use aggregation pipeline with proper stages ($match, $group, $lookup, $project, $sort, $limit, $unwind, $addFields).
3. Consider performance by utilizing available indexes, avoiding $where and full collection scans, and using covered queries where possible.
4. Include sorting (.sort()) and limiting (.limit()) when appropriate for result set management.
5. Put $match stages EARLY in the pipeline to filter data before expensive operations like $lookup or $unwind.
6. Handle null values and existence checks explicitly with $exists and $type operators to differentiate between missing fields, null values, and empty arrays.
7. Do NOT include _id: null in $group results - use meaningful group keys or omit _id entirely with _id: null only when intentional.
8. For date operations, NEVER use an empty new Date() object (e.g. new Date()). ALWAYS specify the date, such as new Date("2024-10-24") or use provided date strings.
9. For Decimal128 operations, prefer range queries over exact equality.

### Array Querying Best Practices (CRITICAL - READ CAREFULLY)

**$elemMatch - ONLY for Query Predicates:**
- CORRECT: Use $elemMatch ONLY in $match stage query predicates
  Example: { "$match": { "balances": { "$elemMatch": { "currency": "BTC", "amount": { "$gt": 1 } } } } }
- WRONG: NEVER use $elemMatch inside $project, $addFields, or $expr
  Example: { "$project": { "btc": { "$elemMatch": [...] } } } ← THIS WILL FAIL!

**Array Operations in Aggregation Expressions:**
- To filter array elements: use $filter operator
  Example: { "$filter": { "input": "$balances", "as": "b", "cond": { "$eq": ["$$b.currency", "BTC"] } } }
- To get first matching element: use $arrayElemAt with $filter
  Example: { "$arrayElemAt": [{ "$filter": { "input": "$balances", "as": "b", "cond": { "$eq": ["$$b.currency", "BTC"] } } }, 0] }
- To check if array contains a simple value: use dot notation in $match
  Example: { "$match": { "balances.currency": "BTC" } }
- To match all elements: use $all operator in $match
  Example: { "$match": { "genres": { "$all": ["Drama", "Crime"] } } }
- To check array length: use $size operator
  Example: { "$match": { "balances": { "$size": 3 } } }

**Summary:**
- $elemMatch → Use ONLY in $match stage for complex array element matching
- $filter → Use in $project/$addFields to extract/transform array elements
- Dot notation → Use in $match for simple array value checks

### $group Stage Rules (CRITICAL)
- The field MUST be "_id" (not "_id:" - no extra colon!)
- All other fields MUST use accumulator operators: $sum, $avg, $first, $last, $push, $addToSet, $min, $max
- WRONG: { "$group": { "_id": "$user_id", "name": "$username" } }
- CORRECT: { "$group": { "_id": "$user_id", "name": { "$first": "$username" }, "count": { "$sum": 1 } } }
`;

  // Dynamic $lookup rules from type mismatches
  if (TYPE_MISMATCHES.length > 0) {
    rules += `\n### $lookup Type Conversion Rules (CRITICAL)\n`;
    for (const m of TYPE_MISMATCHES) {
      rules += `- ${m.collection}.${m.field} is ${m.actualType} but ${m.relatedCollection}.${m.relatedField} is ${m.expectedType}. Use $toString in $lookup:\n`;
      rules += `  { "$lookup": { "from": "${m.collection}", "let": { "id": { "$toString": "$_id" } }, "pipeline": [{ "$match": { "$expr": { "$eq": ["$${m.field}", "$$id"] } } }], "as": "result" } }\n`;
    }
  }

  // Dynamic term mappings from generated catalog
  const collectionMappings = TERM_MAPPINGS?.collections;
  const countryMappings = TERM_MAPPINGS?.countries;

  if (collectionMappings && Object.keys(collectionMappings).length > 0) {
    rules += `\n## TERM MAPPINGS\n`;
    for (const [term, collection] of Object.entries(collectionMappings)) {
      rules += `- "${term}" → ${collection} collection\n`;
    }
  }

  if (countryMappings && Object.keys(countryMappings).length > 0) {
    rules += `\n## COUNTRY MAPPINGS\n`;
    for (const [name, code] of Object.entries(countryMappings)) {
      rules += `- "${name}" = '${code}'\n`;
    }
  }

  rules += `\n## CRITICAL RULE: When to use $lookup vs Direct Query
- Only use $lookup when you NEED data from multiple collections
- If user asks about a single entity type, query that collection DIRECTLY
`;

  return rules;
}

const QUERY_RULES = buildQueryRules();

// ============================================
// Example Queries for AI Training
// ============================================

function getExampleQueries(): string {
  const sevenDaysAgo = getDaysAgoIso(7);

  return `
## EXAMPLE AGGREGATION PATTERNS

### Pattern 1: Array filtering with $filter (CORRECT way)
[
  { "$match": { "items.type": "TARGET_VALUE" } },
  { "$addFields": {
      "filtered": {
        "$arrayElemAt": [
          { "$filter": { "input": "$items", "as": "item", "cond": { "$eq": ["$$item.type", "TARGET_VALUE"] } } },
          0
        ]
      }
  } },
  { "$project": { "_id": 0, "id": 1, "value": "$filtered.amount" } },
  { "$limit": 100 }
]
Note: Uses $filter in $addFields (CORRECT), NOT $elemMatch (which only works in $match)

### Pattern 2: $group with accumulators
[
  { "$match": { "status": "COMPLETED" } },
  { "$group": { "_id": "$type", "total": { "$sum": "$amount" }, "count": { "$sum": 1 } } },
  { "$project": { "_id": 0, "type": "$_id", "total": 1, "count": 1 } },
  { "$sort": { "count": -1 } }
]

### Pattern 3: Date filtering (last 7 days)
[
  { "$match": { "createdAt": { "$gte": { "$date": "${sevenDaysAgo}" } } } },
  { "$sort": { "createdAt": -1 } },
  { "$limit": 50 },
  { "$project": { "_id": 0, "type": 1, "amount": 1, "status": 1, "createdAt": 1 } }
]

### Pattern 4: $lookup with $expr (for type-mismatched keys)
[
  { "$lookup": {
      "from": "related_collection",
      "let": { "refId": { "$toString": "$_id" } },
      "pipeline": [{ "$match": { "$expr": { "$eq": ["$foreignKey", "$$refId"] } } }],
      "as": "joined"
  } },
  { "$unwind": { "path": "$joined", "preserveNullAndEmptyArrays": false } },
  { "$sort": { "joined.value": -1 } },
  { "$limit": 10 }
]

### Pattern 5: $elemMatch in $match stage (CORRECT usage)
[
  { "$match": {
      "items": { "$elemMatch": { "type": "TARGET", "amount": { "$gt": 100 } } }
  } },
  { "$project": { "_id": 0, "id": 1, "total": 1 } },
  { "$limit": 50 }
]
Note: $elemMatch is ONLY valid in $match stage for complex array element matching
`;
}

// ============================================
// Chain of Thought Instructions
// ============================================

const CHAIN_OF_THOUGHT = `
## CHAIN OF THOUGHT
Before generating the pipeline, think step by step:
1. Which collection is the primary source?
2. Do I need to join with other collections via $lookup?
3. What filters ($match) should I apply early in the pipeline?
4. What grouping or aggregation is needed?
5. What fields should the final $project include?
6. Should I add $sort and $limit?
7. Am I handling arrays correctly?
   - Use $elemMatch ONLY in $match stage for complex array matching
   - Use $filter in $project/$addFields to extract array elements
   - Use dot notation in $match for simple array value checks
   - NEVER use $elemMatch inside $project or $expr
8. Are my data types correct (ObjectId, ISODate, strings)?
9. What edge cases should I consider (empty results, null values, missing fields)?

## RESPONSE FORMAT
Respond with a valid JSON object containing:
- pipeline: Array of aggregation stages
- collection: Primary collection name
- explanation: Clear explanation in Spanish of what the query does
- suggestedVisualization: Best chart type ('table', 'bar-chart', 'line-chart', 'pie-chart', 'metric-card')
`;

// ============================================
// Get Date Calculation Examples
// ============================================

function getDateCalculationExamples(): string {
  const currentDate = getCurrentDateIso();
  const sevenDaysAgo = getDaysAgoIso(7);
  const thirtyDaysAgo = getDaysAgoIso(30);

  return `
### Date Calculations (CRITICAL - Use ISODate strings)
Current date: ${currentDate}
- Today: { "$gte": { "$date": "${currentDate}T00:00:00.000Z" } }
- Last 7 days: { "$gte": { "$date": "${sevenDaysAgo}" } }
- Last 30 days: { "$gte": { "$date": "${thirtyDaysAgo}" } }

IMPORTANT: For date filtering, use this exact format in $match:
{ "created_at": { "$gte": { "$date": "2024-11-20T00:00:00.000Z" } } }
`;
}

// ============================================
// Main System Prompt Builder
// ============================================

/**
 * Build the complete system prompt for AI query generation.
 * This is called at runtime to ensure dates are current.
 *
 * @deprecated Use buildDynamicSystemPrompt with focused schema for better performance
 */
export function buildBaseSystemPrompt(): string {
  return `You are an expert data analyst experienced at using MongoDB.
Your job is to take information about a MongoDB database plus a natural language query and generate a MongoDB aggregation pipeline to retrieve the information needed.

${QUERY_RULES}

${getDateCalculationExamples()}

${getExampleQueries()}

${CHAIN_OF_THOUGHT}
`;
}

/**
 * Build system prompt with dynamic schema (Phase 5: Two-Stage Schema Discovery)
 * Uses focused schema from schema builder instead of hardcoded full schema.
 *
 * @param dynamicSchema - Formatted schema string from formatSchemaForPrompt()
 * @returns Complete system prompt with dynamic schema
 */
export function buildDynamicSystemPrompt(dynamicSchema: string): string {
  return `You are an expert data analyst experienced at using MongoDB.
Your job is to take information about a MongoDB database plus a natural language query and generate a MongoDB aggregation pipeline to retrieve the information needed.

${dynamicSchema}

${QUERY_RULES}

${getDateCalculationExamples()}

${getExampleQueries()}

${CHAIN_OF_THOUGHT}
`;
}
