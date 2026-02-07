import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { authComponent } from './auth'
import { roleValidator, type Role } from './schema'

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the current authenticated user's role.
 * Returns null if not authenticated, 'customer' if no role is set.
 */
export const getMyRole = query({
  args: {},
  handler: async (ctx): Promise<Role | null> => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) {
      return null
    }

    const userRole = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .first()

    return (userRole?.role as Role) ?? 'customer'
  },
})

/**
 * Get a user's role by ID. Admin-only query.
 * Use this when admins need to view other users' roles.
 */
export const getUserRoleAdmin = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<Role | null> => {
    // Verify the caller is authenticated
    const caller = await authComponent.getAuthUser(ctx)
    if (!caller) {
      throw new Error('Unauthorized')
    }

    // Verify the caller is admin or owner
    const callerRole = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', caller._id))
      .first()

    if (!callerRole || (callerRole.role !== 'admin' && callerRole.role !== 'owner')) {
      throw new Error('Forbidden: Admin access required')
    }

    const userRole = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first()

    return (userRole?.role as Role) ?? 'customer'
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Ensure the current user has a role assigned (self-assignment).
 * Only allows setting 'customer' role - used after signup.
 * This is safe because the user can only set their own role to 'customer'.
 */
export const ensureMyRole = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) {
      throw new Error('Unauthorized: Must be logged in')
    }

    const now = Date.now()

    // Check if role already exists
    const existing = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .first()

    if (existing) {
      // Role already exists, return it
      return { roleId: existing._id, role: existing.role, isNew: false }
    }

    // Create new role - always 'customer' for self-assignment
    const roleId = await ctx.db.insert('userRoles', {
      userId: user._id,
      role: 'customer',
      createdAt: now,
      updatedAt: now,
    })

    return { roleId, role: 'customer' as Role, isNew: true }
  },
})

/**
 * Set a user's role. Admin/Owner only.
 * Use this when an admin needs to promote/demote users.
 */
export const setRoleForUser = mutation({
  args: {
    userId: v.string(),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    // Verify the caller is authenticated
    const caller = await authComponent.getAuthUser(ctx)
    if (!caller) {
      throw new Error('Unauthorized: Must be logged in')
    }

    // Verify the caller is admin or owner
    const callerRole = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', caller._id))
      .first()

    if (!callerRole || (callerRole.role !== 'admin' && callerRole.role !== 'owner')) {
      throw new Error('Forbidden: Admin access required')
    }

    // Owners can set any role, admins cannot create other owners
    if (args.role === 'owner' && callerRole.role !== 'owner') {
      throw new Error('Forbidden: Only owners can assign owner role')
    }

    // Prevent demoting yourself if you're the only owner
    if (caller._id === args.userId && callerRole.role === 'owner' && args.role !== 'owner') {
      // Check if there are other owners
      const owners = await ctx.db
        .query('userRoles')
        .filter((q) => q.eq(q.field('role'), 'owner'))
        .collect()
      
      if (owners.length <= 1) {
        throw new Error('Forbidden: Cannot demote the last owner')
      }
    }

    const now = Date.now()

    // Check if target user already has a role
    const existing = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        updatedAt: now,
      })
      return { roleId: existing._id, role: args.role, updated: true }
    }

    // Create new role
    const roleId = await ctx.db.insert('userRoles', {
      userId: args.userId,
      role: args.role,
      createdAt: now,
      updatedAt: now,
    })

    return { roleId, role: args.role, updated: false }
  },
})

/**
 * Validate an admin invite code and set the caller's role to admin.
 * The invite code must be set as ADMIN_INVITE_CODE environment variable.
 */
export const claimAdminWithInviteCode = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) {
      throw new Error('Unauthorized: Must be logged in')
    }

    // Validate invite code from environment variable
    const validCode = process.env.ADMIN_INVITE_CODE
    if (!validCode) {
      throw new Error('Admin registration is not configured')
    }

    if (args.inviteCode !== validCode) {
      throw new Error('Invalid invite code')
    }

    const now = Date.now()

    // Check if user already has a role
    const existing = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .first()

    if (existing) {
      // Update to admin
      await ctx.db.patch(existing._id, {
        role: 'admin',
        updatedAt: now,
      })
      return { roleId: existing._id, role: 'admin' as Role }
    }

    // Create new admin role
    const roleId = await ctx.db.insert('userRoles', {
      userId: user._id,
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    })

    return { roleId, role: 'admin' as Role }
  },
})

// ============================================================================
// DEPRECATED - Keep temporarily for migration, will be removed
// ============================================================================

/**
 * @deprecated Use getMyRole instead. This query exposes role data for any user.
 */
export const getUserRole = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    console.warn('DEPRECATED: getUserRole is insecure. Use getMyRole instead.')
    
    // Require authentication at minimum
    const caller = await authComponent.getAuthUser(ctx)
    if (!caller) {
      throw new Error('Unauthorized')
    }
    
    // Only allow users to query their own role through this endpoint
    if (caller._id !== args.userId) {
      throw new Error('Forbidden: Can only query your own role. Use getUserRoleAdmin for admin access.')
    }

    const userRole = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first()

    return userRole?.role ?? 'customer'
  },
})
