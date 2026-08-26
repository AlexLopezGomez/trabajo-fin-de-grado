/**
 * User data needed for authorization
 */
export interface UserWithRole {
    id: string;
    role: string;
    groupIds: string[];
    country?: string;
}

/**
 * Group with members
 */
export interface Group {
    id: string;
    name: string;
    memberIds: string[];
}

/**
 * Space with members
 */
export interface Space {
    id: string;
    name: string;
    memberIds: string[];
    ownerId: string;
}

/**
 * Base repository interface
 */
export interface Repository<T> {
    getById(id: string): Promise<T | null>;
    invalidate(id: string): void;
    clear(): void;
}
