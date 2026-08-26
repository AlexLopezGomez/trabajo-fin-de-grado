import type { Document } from 'mongodb';

const COLLECTION_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_COLLECTION_NAME_LENGTH = 128;

export function validateCollectionName(collection: string): void {
  if (!collection || typeof collection !== 'string') {
    throw new Error('Collection name must be a non-empty string');
  }

  if (!COLLECTION_NAME_REGEX.test(collection)) {
    throw new Error('Invalid collection name format');
  }

  if (
    collection.includes('..') ||
    collection.includes('/') ||
    collection.includes('\\')
  ) {
    throw new Error('Collection name contains invalid characters');
  }

  if (collection.length > MAX_COLLECTION_NAME_LENGTH) {
    throw new Error('Collection name too long');
  }
}

interface PipelineValidationConfig {
  maxStages: number;
  maxLookups: number;
  maxUnwinds: number;
  allowedStages: Set<string>;
  blockedOperators: Set<string>;
}

const PIPELINE_LIMITS: PipelineValidationConfig = {
  maxStages: 20,
  maxLookups: 3,
  maxUnwinds: 5,
  allowedStages: new Set([
    '$match',
    '$project',
    '$group',
    '$sort',
    '$limit',
    '$skip',
    '$lookup',
    '$unwind',
    '$addFields',
    '$count',
    '$facet',
    '$replaceRoot',
    '$replaceWith',
    '$set',
    '$bucket',
    '$bucketAuto',
    '$sortByCount',
  ]),
  blockedOperators: new Set([
    '$where',
    '$function',
    '$accumulator',
    '$out',
    '$merge',
    '$currentOp',
    '$listSessions',
    '$planCacheStats',
  ]),
};

export function validatePipeline(pipeline: Document[]): void {
  if (!Array.isArray(pipeline)) {
    throw new Error('Pipeline must be an array');
  }

  if (pipeline.length === 0) {
    throw new Error('Pipeline cannot be empty');
  }

  if (pipeline.length > PIPELINE_LIMITS.maxStages) {
    throw new Error(
      `Pipeline exceeds maximum stages (${PIPELINE_LIMITS.maxStages})`
    );
  }

  let lookupCount = 0;
  let unwindCount = 0;

  for (const stage of pipeline) {
    const stageKeys = Object.keys(stage);
    if (stageKeys.length !== 1) {
      throw new Error('Each pipeline stage must have exactly one operator');
    }

    const operator = stageKeys[0];

    if (PIPELINE_LIMITS.blockedOperators.has(operator)) {
      throw new Error(`Pipeline operator '${operator}' is not allowed`);
    }

    if (!PIPELINE_LIMITS.allowedStages.has(operator)) {
      throw new Error(`Pipeline operator '${operator}' is not allowed`);
    }

    if (operator === '$lookup') lookupCount++;
    if (operator === '$unwind') unwindCount++;
  }

  if (lookupCount > PIPELINE_LIMITS.maxLookups) {
    throw new Error(
      `Too many $lookup stages (max ${PIPELINE_LIMITS.maxLookups})`
    );
  }

  if (unwindCount > PIPELINE_LIMITS.maxUnwinds) {
    throw new Error(
      `Too many $unwind stages (max ${PIPELINE_LIMITS.maxUnwinds})`
    );
  }

  const pipelineStr = JSON.stringify(pipeline);
  for (const blocked of PIPELINE_LIMITS.blockedOperators) {
    if (pipelineStr.includes(blocked)) {
      throw new Error(`Operator '${blocked}' is not allowed in query scoring`);
    }
  }
}
