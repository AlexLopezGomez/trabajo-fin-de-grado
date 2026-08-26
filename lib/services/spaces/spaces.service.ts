/**
 * Spaces Service Aggregator
 * Re-exports split services for spaces domain.
 */
export { createSpaceService, getSpacesService } from "./spaces-crud.service";
export { getSpaceDetailService, addSpaceMemberService } from "./spaces-members.service";
export { updateSpaceMemberService, removeSpaceMemberService } from "./spaces-members-ops.service";
export { addSpaceGroupAccessService, removeSpaceGroupAccessService } from "./spaces-groups.service";
export { getUserSpacesService } from "./spaces-user.service";
export { updateSpaceService, deleteSpaceService } from "./spaces-core.service";
