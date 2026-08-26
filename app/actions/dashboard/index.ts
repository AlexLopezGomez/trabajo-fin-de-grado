/**
 * Dashboard Actions Index
 * Re-exports from split action files for backward compatibility
 */

// Dashboard CRUD
export { createDashboard, getDashboard, updateDashboard, deleteDashboard } from './dashboards';

// Widget CRUD
export { saveWidget, getDashboardWidgets, updateWidget, deleteWidget, updateWidgetPositions } from './widgets';

// Widget Execution
export { executeAndCacheWidget, refreshWidget, executeWidget, executeDashboardWidgets, getDashboardWithWidgets } from './execution';
