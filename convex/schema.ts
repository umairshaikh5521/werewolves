import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// Typed role validator - prevents invalid role values at the database level
export const roleValidator = v.union(
  v.literal('customer'),
  v.literal('admin'),
  v.literal('owner')
)

export type Role = 'customer' | 'admin' | 'owner'

export default defineSchema({
  // User roles table - stores role for each user
  userRoles: defineTable({
    userId: v.string(), // Better Auth user ID
    role: roleValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),
})
