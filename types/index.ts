// ============================================
// Data Intelligence Dashboard - Type Definitions
// ============================================

/**
 * Represents a single data record from MongoDB
 * Dynamic keys to support any schema
 */
export type DataRecord = Record<string, unknown>;

/**
 * Query response from the AI Engine
 */
export interface QueryResponse {
  success: boolean;
  data: DataRecord[];
  query: string;
  executionTime: number;
  fromCache: boolean;
  suggestedVisualization?: VisualizationType;
  totalRecords: number;
  error?: string;
}

/**
 * Types of visualizations the engine can suggest
 */
export type VisualizationType = 
  | 'table' 
  | 'bar-chart' 
  | 'line-chart' 
  | 'pie-chart' 
  | 'area-chart'
  | 'metric-card';

/**
 * Query request payload
 */
export interface QueryRequest {
  question: string;
  limit?: number;
}

/**
 * Schema field definition for the AI prompt
 */
export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  description?: string;
  examples?: string[];
}

/**
 * Collection schema for AI context
 */
export interface CollectionSchema {
  collectionName: string;
  description: string;
  fields: SchemaField[];
}

/**
 * Cache entry structure
 */
export interface CacheEntry {
  response: QueryResponse;
  timestamp: number;
  ttl: number;
}

/**
 * Chart data point for Recharts
 */
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

/**
 * Query history item
 */
export interface QueryHistoryItem {
  id: string;
  question: string;
  timestamp: Date;
  success: boolean;
}

/**
 * Dashboard stats
 */
export interface DashboardStats {
  totalQueries: number;
  cachedQueries: number;
  avgResponseTime: number;
  lastUpdated: Date;
}

// ============================================
// Financial Data Types
// ============================================

/**
 * User document from MongoDB
 */
export interface User {
  _id: string;
  email: string;
  username: string;
  full_name: string;
  country: string;
  created_at: Date;
  kyc_level: 'level_0' | 'level_1' | 'level_2' | 'level_3';
}

/**
 * Wallet balance item
 */
export interface WalletBalance {
  currency: string;
  amount: number;
  locked: number;
}

/**
 * Wallet document from MongoDB
 */
export interface Wallet {
  _id: string;
  user_id: string;
  total_value_eur: number;
  balances: WalletBalance[];
  updated_at: Date;
}

/**
 * Transaction document from MongoDB
 */
export interface Transaction {
  _id: string;
  user_id: string;
  type: 'buy' | 'sell' | 'deposit' | 'withdrawal' | 'transfer';
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  fee: number;
  created_at: Date;
  completed_at: Date | null;
}

/**
 * Order document from MongoDB
 */
export interface Order {
  _id: string;
  user_id: string;
  pair: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  status: 'open' | 'filled' | 'partially_filled' | 'cancelled';
  price: number | null;
  amount: number;
  filled_amount: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Crypto price document from MongoDB
 */
export interface CryptoPrice {
  _id: string;
  symbol: string;
  price_eur: number;
  price_usd: number;
  change_24h: number;
  volume_24h: number;
  market_cap: number;
  updated_at: Date;
}

// ============================================
// AI Query Types
// ============================================

/**
 * MongoDB Aggregation Pipeline Stage
 */
export type PipelineStage = Record<string, unknown>;

/**
 * AI Query Result from generateObject
 */
export interface AIQueryResult {
  pipeline: PipelineStage[];
  collection: string;
  explanation: string;
  suggestedVisualization: VisualizationType;
}

/**
 * Full query execution result
 */
export interface QueryExecutionResult {
  success: boolean;
  data: DataRecord[];
  pipeline: PipelineStage[];
  collection: string;
  explanation: string;
  suggestedVisualization: string;
  executionTime: number;
  error?: string;
}
