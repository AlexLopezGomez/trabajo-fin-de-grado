/**
 * Dashboard Sharing Module
 *
 * Re-exports all dashboard sharing functionality from specialized services.
 */

// Export everything from the facade (provides backward compatibility)
export * from './dashboard-sharing.facade';

// Export individual services for direct access if needed
export * as SharingMode from './sharing-mode.service';
export * as SharingRules from './sharing-rules.service';
export * as SharingTargets from './sharing-targets.service';