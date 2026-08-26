/**
 * MongoDB operation types to replace 'any' usage
 */

import { ObjectId } from "mongodb";

// ============================================
// UPDATE OPERATIONS
// ============================================

export interface MongoUpdateOperation {
  $set?: Record<string, any>;
  $unset?: Record<string, any>;
  $push?: Record<string, any>;
  $pull?: Record<string, any>;
  $pullAll?: Record<string, any>;
  $addToSet?: Record<string, any>;
  $inc?: Record<string, any>;
}

// ============================================
// COMMON UPDATE PATTERNS
// ============================================

export interface GroupMemberUpdate {
  $pull: { memberIds: { $in: ObjectId[] } };
  $set: { updatedAt: Date };
}

export interface UserGroupUpdate {
  $pull: { groupIds: ObjectId };
  $set: { updatedAt: Date };
}

export interface LastLoginUpdate {
  $set: { lastLoginAt: Date };
  $addToSet: { providers: string };
}

// ============================================
// TYPE GUARDS FOR MONGODB OPERATIONS
// ============================================

export function isValidMongoUpdate(obj: unknown): obj is MongoUpdateOperation {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (
      '$set' in obj ||
      '$unset' in obj ||
      '$push' in obj ||
      '$pull' in obj ||
      '$pullAll' in obj ||
      '$addToSet' in obj ||
      '$inc' in obj
    )
  );
}

// ============================================
// AGGREGATION PIPELINES
// ============================================

export type AggregationPipeline = Record<string, unknown>[];

export interface AggregationStage {
  $match?: Record<string, unknown>;
  $sort?: Record<string, unknown>;
  $skip?: number;
  $limit?: number;
  $lookup?: {
    from: string;
    let?: Record<string, unknown>;
    pipeline?: AggregationPipeline;
    as: string;
  };
  $unwind?: string | { path: string; preserveNullAndEmptyArrays?: boolean };
  $group?: Record<string, unknown>;
  $project?: Record<string, unknown>;
  $addFields?: Record<string, unknown>;
}