import { createMiddleware } from '@tanstack/react-start'

/**
 * Request middleware for protecting routes
 * This runs on all server requests (SSR, server routes, etc.)
 */
export const routeAuthMiddleware = createMiddleware({ type: 'request' })
  .server(async ({ next, request }) => {
    // Get cookies from request
    const cookieHeader = request.headers.get('cookie') || ''
    
    // Check for auth session cookie (Better Auth uses this pattern)
    const hasAuthCookie = cookieHeader.includes('better-auth.session')
    
    console.log('[RouteAuth] Checking auth...', { hasAuthCookie })
    
    return next({
      context: {
        hasAuthCookie,
      },
    })
  })

/**
 * Request middleware for logging all requests
 */
export const requestLoggingMiddleware = createMiddleware({ type: 'request' })
  .server(async ({ next, request }) => {
    const start = Date.now()
    const url = new URL(request.url)
    
    console.log(`[Request] ${request.method} ${url.pathname}`)
    
    const result = await next()
    
    console.log(`[Request] ${request.method} ${url.pathname} - ${Date.now() - start}ms`)
    
    return result
  })
