// ============================================
// MongoDB Database Connection & Utilities
// Optimized for Aggregation Pipelines
// ============================================

import { MongoClient, Db, Document } from 'mongodb';
import { logger } from '@/lib/utils/logger';
import { isAuthCollection } from './constants';

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB = process.env.MONGODB_DATABASE || 'internal_dashboard_db';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

const AUTH_MONGODB_URI = process.env.AUTH_MONGODB_URI;

// Global cache for MongoDB client
const globalWithMongo = global as typeof globalThis & {
  _mongoClient?: MongoClient;
  _mongoClientPromise?: Promise<MongoClient>;
  _authMongoClient?: MongoClient;
  _authMongoClientPromise?: Promise<MongoClient>;
};

let clientPromise: Promise<MongoClient>;
let authClientPromise: Promise<MongoClient> | undefined;

if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable to preserve connection across HMR
  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;

  // Setup Auth Client (if URI differs)
  if (AUTH_MONGODB_URI && AUTH_MONGODB_URI !== MONGODB_URI) {
    if (!globalWithMongo._authMongoClientPromise) {
      const authClient = new MongoClient(AUTH_MONGODB_URI);
      globalWithMongo._authMongoClientPromise = authClient.connect();
    }
    authClientPromise = globalWithMongo._authMongoClientPromise;
  }
} else {
  // In production, create a new client for each request
  const client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();

  if (AUTH_MONGODB_URI && AUTH_MONGODB_URI !== MONGODB_URI) {
    const authClient = new MongoClient(AUTH_MONGODB_URI);
    authClientPromise = authClient.connect();
  }
}

/**
 * Get the MongoDB database instance
 */
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  if (process.env.NODE_ENV !== 'production') {
    logger.db('Using database connection', undefined, {
      database: MONGODB_DB,
    });
  }
  return client.db(MONGODB_DB);
}

/**
 * Convert Extended JSON date format to JavaScript Date objects
 * Also fixes common AI typos like "_id:" -> "_id"
 * Validates and fixes invalid pipeline stages (e.g., negative $limit)
 */
function preprocessPipeline(pipeline: Document[]): Document[] {
  const processValue = (value: unknown): unknown => {
    if (value === null || value === undefined) return value;

    if (Array.isArray(value)) {
      return value.map(processValue);
    }

    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;

      // Convert { "$date": "ISO_STRING" } to Date object
      if ('$date' in obj && typeof obj.$date === 'string') {
        return new Date(obj.$date);
      }

      // Process nested objects and fix typos
      const processed: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        // Fix common AI typo: "_id:" -> "_id"
        const fixedKey = key.replace(/:$/, '');
        processed[fixedKey] = processValue(val);
      }
      return processed;
    }

    return value;
  };

  // Process each stage and validate
  return pipeline.map((stage) => {
    const processed = processValue(stage) as Document;

    // Fix invalid $limit values (AI sometimes generates 0 or negative limits)
    if ('$limit' in processed) {
      const limitValue = processed.$limit;
      if (typeof limitValue === 'number' && limitValue <= 0) {
        logger.warn('[DB] Invalid $limit value detected, replacing with 100', {
          originalValue: limitValue,
          replacedWith: 100,
        });
        processed.$limit = 100;
      }
    }

    // Fix invalid $skip values (negative skip)
    if ('$skip' in processed) {
      const skipValue = processed.$skip;
      if (typeof skipValue === 'number' && skipValue < 0) {
        logger.warn('[DB] Invalid $skip value detected, replacing with 0', {
          originalValue: skipValue,
          replacedWith: 0,
        });
        processed.$skip = 0;
      }
    }

    return processed;
  });
}

/**
 * Convert MongoDB documents to plain objects safe for Client Components
 * Converts ObjectId instances to strings recursively
 */
function serializeMongoDocument(doc: unknown): unknown {
  if (doc === null || doc === undefined) {
    return doc;
  }

  // Handle arrays
  if (Array.isArray(doc)) {
    return doc.map(serializeMongoDocument);
  }

  // Handle Date objects
  if (doc instanceof Date) {
    return doc.toISOString();
  }

  // Handle ObjectId (has toHexString method)
  if (doc && typeof doc === 'object' && 'toHexString' in doc && typeof doc.toHexString === 'function') {
    return doc.toHexString();
  }

  // Handle plain objects
  if (typeof doc === 'object') {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(doc)) {
      serialized[key] = serializeMongoDocument(value);
    }
    return serialized;
  }

  // Primitives
  return doc;
}

/**
 * Execute an aggregation pipeline on a collection
 * Includes safety checks to prevent write operations
 * Returns serialized documents safe for Client Components
 */
export async function executeAggregation<T extends Document = Document>(
  collectionName: string,
  pipeline: Document[]
): Promise<T[]> {
  // Security: Block any write operations
  const writeOperations = ['$out', '$merge'];
  const hasWriteOp = pipeline.some((stage) =>
    writeOperations.some((op) => op in stage)
  );

  if (hasWriteOp) {
    throw new Error('Write operations ($out, $merge) are not allowed');
  }

  // Preprocess pipeline to convert dates and fix typos
  const processedPipeline = preprocessPipeline(pipeline);

  let db: Db;

  if (isAuthCollection(collectionName)) {
    const authDbName = process.env.AUTH_DATABASE || 'internal_dashboard_auth_db';

    // Select the correct client: Auth Client (if cross-cluster) or Default Client
    if (authClientPromise) {
      const authClient = await authClientPromise;
      db = authClient.db(authDbName);
      if (process.env.NODE_ENV !== 'production') {
        logger.info('[DB] Routing to Auth Database (Dedicated Cluster)', { collection: collectionName, db: authDbName });
      }
    } else {
      // Fallback: Same cluster
      const client = await clientPromise;
      db = client.db(authDbName);
      if (process.env.NODE_ENV !== 'production') {
        logger.info('[DB] Routing to Auth Database (Same Cluster)', { collection: collectionName, db: authDbName });
      }
    }
  } else {
    // Default to business database
    const client = await clientPromise;
    db = client.db(MONGODB_DB);
    if (process.env.NODE_ENV !== 'production') {
      logger.info('[DB] Routing to Business Database', { collection: collectionName, db: MONGODB_DB });
    }
  }

  const collection = db.collection(collectionName);

  const startTime = Date.now();
  const results = await collection.aggregate<T>(processedPipeline).toArray();
  const executionTime = Date.now() - startTime;

  logger.info('[DB] Aggregation completed', {
    collection: collectionName,
    executionTimeMs: executionTime,
    resultCount: results.length,
  });

  // Serialize all documents to remove ObjectId instances
  return results.map(doc => serializeMongoDocument(doc)) as T[];
}

/**
 * Get collection stats for context
 */
export async function getCollectionStats(collectionName: string) {
  let db: Db;
  if (isAuthCollection(collectionName)) {
    const authDbName = process.env.AUTH_DATABASE || 'internal_dashboard_auth_db';
    if (authClientPromise) {
      db = (await authClientPromise).db(authDbName);
    } else {
      db = (await clientPromise).db(authDbName);
    }
  } else {
    db = await getDatabase();
  }

  const stats = await db.collection(collectionName).estimatedDocumentCount();
  return { collection: collectionName, estimatedCount: stats };
}

/**
 * Get the Auth/Platform database instance.
 * Uses AUTH_MONGODB_URI if configured, otherwise falls back to MONGODB_URI
 * with AUTH_DATABASE (or default 'internal_dashboard_auth_db').
 */
export async function getAuthDatabase(): Promise<Db> {
  const authDbName = process.env.AUTH_DATABASE || 'internal_dashboard_auth_db';
  if (authClientPromise) {
    const authClient = await authClientPromise;
    return authClient.db(authDbName);
  }
  const client = await clientPromise;
  return client.db(authDbName);
}

/**
 * Get the MongoDB client for the auth/platform database
 */
export async function getAuthMongoClient(): Promise<MongoClient> {
  if (authClientPromise) return authClientPromise;
  return clientPromise;
}

/**
 * Get the MongoDB client (for NextAuth adapter)
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (authClientPromise) return authClientPromise;
  return clientPromise;
}

export { clientPromise, authClientPromise };

