import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ConvexReactClient } from 'convex/react'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { createServerFn } from '@tanstack/react-start'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import type { QueryClient } from '@tanstack/react-query'

import { authClient } from '@/lib/auth-client'
import { getToken } from '@/lib/auth-server'
import appCss from '../styles.css?url'

const convexClient = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!)

const getAuth = createServerFn({ method: 'GET' }).handler(async () => {
  return await getToken()
})

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  convexQueryClient: ConvexQueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
      },
      {
        title: 'Moonrise - Social Deduction Game',
      },
      {
        name: 'description',
        content: 'A real-time multiplayer werewolf game. Trust no one.',
      },
      {
        name: 'theme-color',
        content: '#0f1729',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),

  beforeLoad: async () => {
    try {
      const token = await getAuth()
      return { initialToken: token }
    } catch {
      return { initialToken: null }
    }
  },

  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function RootComponent() {
  const { initialToken } = useRouteContext({ from: '__root__' })

  return (
    <ConvexBetterAuthProvider
      client={convexClient}
      authClient={authClient}
      initialToken={initialToken}
    >
      <Outlet />
    </ConvexBetterAuthProvider>
  )
}

function NotFound() {
  return (
    <div className="stars-bg flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
        <span className="text-3xl">🌕</span>
      </div>
      <h1 className="font-display text-3xl font-bold text-foreground">Lost in the woods</h1>
      <p className="text-sm text-muted-foreground">This page doesn't exist</p>
      <Link to="/game" className="game-btn bg-primary px-6 py-2.5 text-sm text-primary-foreground">
        Go Home
      </Link>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
