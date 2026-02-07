import { createServerFn } from '@tanstack/react-start'
import { authMiddleware, loggingMiddleware } from '@/middleware/auth'

/**
 * Example: Protected server function that requires authentication
 * Uses authMiddleware to check auth before executing
 */
export const getProtectedData = createServerFn()
  .middleware([loggingMiddleware, authMiddleware])
  .handler(async () => {
    // This only runs if user is authenticated
    return {
      message: 'This is protected data!',
      timestamp: new Date().toISOString(),
    }
  })

/**
 * Example: Protected server function with data input
 */
export const updateProfile = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .handler(async ({ data }: { data: { name: string; email: string } }) => {
    // Validate manually or add zod-adapter if needed
    if (!data.name || data.name.length < 2) {
      throw new Error('Name must be at least 2 characters')
    }
    if (!data.email || !data.email.includes('@')) {
      throw new Error('Invalid email')
    }
    
    console.log('Updating profile:', data.name, data.email)
    
    return {
      success: true,
      message: `Profile updated for ${data.name}`,
    }
  })

/**
 * Example: Public server function (no auth required)
 */
export const getPublicData = createServerFn()
  .middleware([loggingMiddleware])
  .handler(async () => {
    return {
      message: 'This is public data',
      timestamp: new Date().toISOString(),
    }
  })
