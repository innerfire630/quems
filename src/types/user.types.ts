// =============================================================================
// src/types/user.types.ts — User API request/response types (1.3.3)
// =============================================================================
// Shared type contract between user API endpoints and client components.
// All types exclude the password field. Wrap in { success, data, meta } at
// the route level per the Master Plan envelope.
// =============================================================================

/** Shape of a user in the listing response. */
export interface UserListItem {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: { id: string; name: string; description: string | null }[];
  createdAt: string;
  updatedAt: string;
}

/** Shape of a single user in the detail response (includes computed permissions). */
export interface UserDetail extends UserListItem {
  permissions: string[];
}

/** Shape returned by POST /api/users (create). */
export type CreateUserResponse = UserListItem;

/** Shape returned by POST /api/users/[userId]/reset-password. */
export interface ResetPasswordResponse {
  temporaryPassword: string;
  userId: string;
}

/** Pagination metadata. */
export interface UserListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Shape of a role option (used in form selects). */
export interface RoleOption {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
}
