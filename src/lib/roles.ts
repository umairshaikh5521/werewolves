/**
 * Organization roles for the dental app
 * These match the roles defined in the Organization plugin
 */
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  CUSTOMER: 'customer',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  customer: 'Customer',
}

/**
 * Check if a role has admin-level access (owner or admin)
 */
export function isAdminOrOwner(role?: string | null): boolean {
  return role === ROLES.ADMIN || role === ROLES.OWNER
}

/**
 * Check if a role is customer
 */
export function isCustomer(role?: string | null): boolean {
  return role === ROLES.CUSTOMER
}

/**
 * Check if user has one of the allowed roles
 */
export function hasRole(
  userRole: string | null | undefined,
  allowedRoles: Role[]
): boolean {
  if (!userRole) return false
  return allowedRoles.includes(userRole as Role)
}
