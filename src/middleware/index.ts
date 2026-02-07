// Server function middleware (type: 'function')
// Use with createServerFn().middleware([...])
export { authMiddleware, loggingMiddleware } from './auth'

// Request middleware (type: 'request')
// Use with route server.middleware or all server requests
export { routeAuthMiddleware, requestLoggingMiddleware } from './routeAuth'
