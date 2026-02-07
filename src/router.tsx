import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const getRouter = () => {
  // Use import.meta.env for Vite environment variables (consistent with TanStack Start)
  const convexQueryClient = new ConvexQueryClient(import.meta.env.VITE_CONVEX_URL!)

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  })

  convexQueryClient.connect(queryClient)

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      context: {
        queryClient,
        convexQueryClient,
      },
      scrollRestoration: true,
      defaultPreloadStaleTime: 0,
    }),
    queryClient,
  )

  return router
}
