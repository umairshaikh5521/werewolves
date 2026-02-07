import { createServerFn } from '@tanstack/react-start'
import { fetchAuthQuery } from '@/lib/auth-server'
import { api } from '../../convex/_generated/api'

/**
 * Server function to get the current authenticated user.
 * Use this in route `beforeLoad` for server-side auth protection.
 */
export const getCurrentUserServer = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const user = await fetchAuthQuery(api.auth.getCurrentUser)
      return user
    } catch {
      return null
    }
  }
)

/**
 * Server function to get the current user's role.
 * Use this in route `beforeLoad` for role-based access control.
 */
export const getMyRoleServer = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const role = await fetchAuthQuery(api.userRoles.getMyRole)
      return role
    } catch {
      return null
    }
  }
)

/**
 * Server function to check if user is authenticated and has admin/owner role.
 * Returns { isAdmin: boolean, user: User | null, role: string | null }
 */
export const checkAdminServer = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const [user, role] = await Promise.all([
        fetchAuthQuery(api.auth.getCurrentUser),
        fetchAuthQuery(api.userRoles.getMyRole),
      ])

      return {
        isAuthenticated: !!user,
        isAdmin: role === 'admin' || role === 'owner',
        user,
        role,
      }
    } catch {
      return {
        isAuthenticated: false,
        isAdmin: false,
        user: null,
        role: null,
      }
    }
  }
)
