// ============================================
// Mock Data for UI Testing
// Replace with real MongoDB queries later
// ============================================

import { QueryResponse, DataRecord, CollectionSchema } from '@/types';

/**
 * Mock collection schema - Replace with your actual schema
 */
export const mockSchema: CollectionSchema = {
  collectionName: 'transactions',
  description: 'Financial transactions with customer data',
  fields: [
    { name: '_id', type: 'string', description: 'Unique identifier' },
    { name: 'customer_name', type: 'string', description: 'Customer full name' },
    { name: 'email', type: 'string', description: 'Customer email' },
    { name: 'amount', type: 'number', description: 'Transaction amount in USD' },
    { name: 'status', type: 'string', description: 'Transaction status', examples: ['completed', 'pending', 'failed'] },
    { name: 'category', type: 'string', description: 'Transaction category', examples: ['electronics', 'clothing', 'food', 'services'] },
    { name: 'date', type: 'date', description: 'Transaction date' },
    { name: 'region', type: 'string', description: 'Geographic region', examples: ['North', 'South', 'East', 'West'] },
  ],
};

/**
 * Generate mock transaction data
 */
function generateMockTransactions(count: number): DataRecord[] {
  const names = ['Alice Johnson', 'Bob Smith', 'Carlos García', 'Diana Chen', 'Elena Petrova', 'Frank Miller', 'Grace Kim', 'Henry Brown'];
  const statuses = ['completed', 'pending', 'failed'];
  const categories = ['electronics', 'clothing', 'food', 'services', 'travel', 'entertainment'];
  const regions = ['North', 'South', 'East', 'West', 'Central'];

  return Array.from({ length: count }, (_, i) => ({
    _id: `txn_${String(i + 1).padStart(6, '0')}`,
    customer_name: names[Math.floor(Math.random() * names.length)],
    email: `customer${i + 1}@example.com`,
    amount: Math.round(Math.random() * 5000 * 100) / 100,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
    region: regions[Math.floor(Math.random() * regions.length)],
  }));
}

/**
 * Mock aggregated data for charts
 */
function generateSalesByCategory(): DataRecord[] {
  return [
    { category: 'Electronics', total: 125430, count: 234 },
    { category: 'Clothing', total: 89250, count: 456 },
    { category: 'Food', total: 67890, count: 789 },
    { category: 'Services', total: 45670, count: 123 },
    { category: 'Travel', total: 34560, count: 87 },
    { category: 'Entertainment', total: 23450, count: 156 },
  ];
}

function generateSalesByMonth(): DataRecord[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map((month, _i) => ({
    month,
    sales: Math.round(50000 + Math.random() * 50000),
    transactions: Math.round(100 + Math.random() * 200),
  }));
}

function generateStatusDistribution(): DataRecord[] {
  return [
    { status: 'Completed', count: 8543, percentage: 78.5 },
    { status: 'Pending', count: 1876, percentage: 17.2 },
    { status: 'Failed', count: 467, percentage: 4.3 },
  ];
}

function generateTopCustomers(): DataRecord[] {
  return [
    { customer_name: 'TechCorp Industries', total_spent: 145230.50, orders: 234 },
    { customer_name: 'Global Retail Ltd', total_spent: 98760.25, orders: 189 },
    { customer_name: 'StartUp Innovations', total_spent: 76540.00, orders: 156 },
    { customer_name: 'E-Commerce Plus', total_spent: 65430.75, orders: 134 },
    { customer_name: 'Digital Solutions', total_spent: 54320.50, orders: 112 },
  ];
}

/**
 * Simulated delay for realistic UX
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock query processor - simulates AI interpretation
 */
export async function processMockQuery(question: string): Promise<QueryResponse> {
  const startTime = Date.now();

  // Simulate processing time (300-800ms)
  await delay(300 + Math.random() * 500);

  const normalizedQuestion = question.toLowerCase();

  let data: DataRecord[];
  let suggestedVisualization: QueryResponse['suggestedVisualization'] = 'table';

  // Pattern matching for different query types
  if (normalizedQuestion.includes('category') || normalizedQuestion.includes('categoría')) {
    data = generateSalesByCategory();
    suggestedVisualization = 'bar-chart';
  } else if (normalizedQuestion.includes('month') || normalizedQuestion.includes('mes') || normalizedQuestion.includes('trend') || normalizedQuestion.includes('tendencia')) {
    data = generateSalesByMonth();
    suggestedVisualization = 'line-chart';
  } else if (normalizedQuestion.includes('status') || normalizedQuestion.includes('estado') || normalizedQuestion.includes('distribution') || normalizedQuestion.includes('distribución')) {
    data = generateStatusDistribution();
    suggestedVisualization = 'pie-chart';
  } else if (normalizedQuestion.includes('top') || normalizedQuestion.includes('best') || normalizedQuestion.includes('mejores')) {
    data = generateTopCustomers();
    suggestedVisualization = 'table';
  } else if (normalizedQuestion.includes('total') || normalizedQuestion.includes('sum') || normalizedQuestion.includes('count')) {
    data = [{
      metric: 'Total Transactions',
      value: 108876,
      average: 423.50,
      period: '2024'
    }];
    suggestedVisualization = 'metric-card';
  } else {
    // Default: return sample transactions
    data = generateMockTransactions(15);
    suggestedVisualization = 'table';
  }

  const executionTime = Date.now() - startTime;

  return {
    success: true,
    data,
    query: `// Mock aggregation pipeline for: "${question}"`,
    executionTime,
    fromCache: false,
    suggestedVisualization,
    totalRecords: data.length,
  };
}

/**
 * Example queries for the UI placeholder/suggestions
 */
export const exampleQueries = [
  '¿Cuáles son las ventas por categoría?',
  'Muéstrame la tendencia de ventas por mes',
  '¿Cuál es la distribución de estados de transacciones?',
  'Top 5 clientes por monto total',
  '¿Cuántas transacciones hay en total?',
  'Transacciones pendientes del último mes',
];

