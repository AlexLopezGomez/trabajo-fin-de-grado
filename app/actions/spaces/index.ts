/**
 * Spaces Actions Index
 * Re-exports from split action files for backward compatibility
 */

// Space CRUD & Membership
export {
  createSpace,
  getSpaces,
  getMySpaces,
  getSpaceDetail,
  getSpaceDashboards,
  updateSpace,
  deleteSpace,
  addSpaceMember,
  updateSpaceMember,
  removeSpaceMember,
  addSpaceGroupAccess,
  removeSpaceGroupAccess,
} from "./spaces";

// Dashboard Sharing
export {
  getDashboardSharing,
  updateDashboardSharingMode,
  addDashboardSharingRule,
  updateDashboardSharingRule,
  removeDashboardSharingRule,
  moveDashboardToSpace,
  searchShareTargets,
  getAccessibleDashboardsAction,
  checkMyDashboardPermission,
} from "./sharing";
