/**
 * Database operation types
 */

import { Db, ClientSession } from "mongodb";

// ============================================
// DATABASE OPERATION TYPES
// ============================================

export type DatabaseClient = Db;
export type DatabaseSession = ClientSession;