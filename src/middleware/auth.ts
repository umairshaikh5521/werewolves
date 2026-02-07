import { createMiddleware } from '@tanstack/react-start'
import { authClient } from '@/lib/auth-client'
import { fetchAuthQuery } from '@/lib/auth-server'
import { api } from '../../convex/_generated/api'

/**
 * Auth middleware that checks if user is authenticated
 * Can be used with server functions and routes
 * 
 * SECURITY: Both client and server handlers validate authentication.
 * The server handler verifies the session using Convex's auth component.
 */
export const authMiddleware = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    // Client-side: Check session and add auth token to headers
    const session = await authClient.getSession()
    
    if (!session.data?.session) {
      // Redirect to login on client side
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }

    return next({
      headers: {
        Authorization: `Bearer ${session.data.session.token}`,
      },
    })
  })
  .server(async ({ next }) => {
    // Server-side: Validate auth by querying Convex with the session
    try {
      const user = await fetchAuthQuery(api.auth.getCurrentUser)
      
      if (!user) {
        throw new Error('Unauthorized - no authenticated user')
      }

      return next({
        context: {
          isAuthenticated: true,
          user,
        },
      })
    } catch {
      throw new Error('Unauthorized - invalid or expired session')
    }
  })

/**
 * Logging middleware for debugging
 */
export const loggingMiddleware = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    const start = Date.now()
    console.log('[Client] Request starting...')
    
    const result = await next()
    
    console.log(`[Client] Request completed in ${Date.now() - start}ms`)
    return result
  })
  .server(async ({ next }) => {
    const start = Date.now()
    console.log('[Server] Processing request...')
    
    const result = await next()
    
    console.log(`[Server] Request completed in ${Date.now() - start}ms`)
    return result
  })
