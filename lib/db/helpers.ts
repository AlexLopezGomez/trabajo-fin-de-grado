/**
 * Database Helper Utilities
 *
 * Centralized utilities to reduce code duplication across Server Actions.
 *
 * Two database access patterns:
 * - withDatabase / withDatabaseTransaction â†’ MONGODB_URI (project/business data)
 * - withAuthDatabase / withAuthDatabaseTransaction â†’ AUTH_MONGODB_URI (platform data)
 */

import { getDatabase, getAuthDatabase, getAuthMongoClient } from '@/lib/db';
import type { Db, ObjectId as ObjectIdType, MongoClient, ClientSession } from 'mongodb';

/**
 * Execute a database operation against the business/project database (MONGODB_URI).
 * Use this for project-specific data like financial transactions, user activity, etc.
 */
export async function withDatabase<T>(
  callback: (db: Db, ObjectId: typeof ObjectIdType) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  const { ObjectId } = await import('mongodb');
  return callback(db, ObjectId);
}

/**
 * Execute a database operation against the auth/platform database (AUTH_MONGODB_URI).
 * Use this for platform collections: users, dashboards, spaces, permissions, audit logs, etc.
 */
export async function withAuthDatabase<T>(
  callback: (db: Db, ObjectId: typeof ObjectIdType) => Promise<T>
): Promise<T> {
  const db = await getAuthDatabase();
  const { ObjectId } = await import('mongodb');
  return callback(db, ObjectId);
}

export function serialize<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export function serializeDate(date: Date | string | undefined): string {
  if (!date) return new Date().toISOString();
  if (typeof date === 'string') return date;
  return date.toISOString();
}

export async function toObjectId(id: string): Promise<ObjectIdType> {
  const { ObjectId } = await import('mongodb');
  if (!ObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }
  return new ObjectId(id);
}

export async function toObjectIdArray(ids: string[]): Promise<ObjectIdType[]> {
  const { ObjectId } = await import('mongodb');
  return ids.map(id => {
    if (!ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }
    return new ObjectId(id);
  });
}

/**
 * @internal Used primarily by withDatabaseTransaction
 */
export async function getMongoClient(): Promise<MongoClient> {
  const db = await getDatabase();
  return db.client;
}

/**
 * Execute a database operation within a transaction on the business/project database.
 */
export async function withDatabaseTransaction<T>(
  callback: (db: Db, session: ClientSession, ObjectId: typeof ObjectIdType) => Promise<T>
): Promise<T> {
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DATABASE || 'internal_dashboard_db');
  const { ObjectId } = await import('mongodb');
  const session = client.startSession();

  try {
    session.startTransaction();
    const result = await callback(db, session, ObjectId);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Execute a database operation within a transaction on the auth/platform database.
 */
export async function withAuthDatabaseTransaction<T>(
  callback: (db: Db, session: ClientSession, ObjectId: typeof ObjectIdType) => Promise<T>
): Promise<T> {
  const client = await getAuthMongoClient();
  const authDbName = process.env.AUTH_DATABASE || 'internal_dashboard_auth_db';
  const db = client.db(authDbName);
  const { ObjectId } = await import('mongodb');
  const session = client.startSession();

  try {
    session.startTransaction();
    const result = await callback(db, session, ObjectId);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

