/**
 * Share Modal - Barrel Export
 * Re-exports all share modal components and hooks
 */

// Main component (exported from share-modal.tsx in parent directory)

// Sub-components
export { SharingModeSelector } from "./SharingModeSelector";
export { ShareTargetSearch } from "./ShareTargetSearch";
export { AccessList } from "./AccessList";
export { AccessListItem } from "./AccessListItem";
export { ShareModalFooter } from "./ShareModalFooter";
export { UnsavedChangesDialog } from "./UnsavedChangesDialog";

// Hooks
export { useDashboardSharing } from "./hooks/useDashboardSharing";
export { useShareTargetSearch } from "./hooks/useShareTargetSearch";

// Constants
export * from "./constants";

// Types
export * from "./types";
