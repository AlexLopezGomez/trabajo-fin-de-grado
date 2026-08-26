/**
 * Dashboard & Widget Server Actions
 * 
 * DEPRECATED: This file now re-exports from the split action files.
 * Import from '@/app/actions/dashboard' for the same exports.
 */

// Dashboard CRUD
export { createDashboard, getDashboard, updateDashboard, deleteDashboard } from './dashboard/dashboards';

// Widget CRUD
export { saveWidget, getDashboardWidgets, updateWidget, deleteWidget, updateWidgetPositions } from './dashboard/widgets';

// Widget Execution
export { executeAndCacheWidget, refreshWidget, executeWidget, executeDashboardWidgets, getDashboardWithWidgets } from './dashboard/execution';
