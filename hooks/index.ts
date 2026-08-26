/**
 * Hooks Module - Barrel Export
 * 
 * Custom hooks that extract business logic from UI components.
 * Makes components thinner and logic testable in isolation.
 * 
 * @module hooks
 */

// Admin page hooks
export {
    useAddMemberModal,
    type UseAddMemberModalProps,
    type UseAddMemberModalReturn,
    type AddedMember,
    type AddedGroup,
} from './useAddMemberModal';

