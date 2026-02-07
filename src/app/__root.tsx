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
        name: 'keywords',
        content: 'werewolf game, social deduction, multiplayer game, online game, party game, mafia game, moonrise',
      },
      {
        name: 'author',
        content: 'Moonrise',
      },
      {
        name: 'theme-color',
        content: '#0f1729',
      },
      // Open Graph / Facebook
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:url',
        content: 'https://moonrise-game.vercel.app',
      },
      {
        property: 'og:title',
        content: 'Moonrise - Social Deduction Game',
      },
      {
        property: 'og:description',
        content: 'A real-time multiplayer werewolf game. Trust no one.',
      },
      {
        property: 'og:image',
        content: 'https://moonrise-game.vercel.app/social-share.png',
      },
      {
        property: 'og:image:secure_url',
        content: 'https://moonrise-game.vercel.app/social-share.png',
      },
      {
        property: 'og:image:type',
        content: 'image/png',
      },
      {
        property: 'og:image:width',
        content: '1200',
      },
      {
        property: 'og:image:height',
        content: '630',
      },
      {
        property: 'og:image:alt',
        content: 'Moonrise - Social Deduction. Trust No One.',
      },
      {
        property: 'og:site_name',
        content: 'Moonrise',
      },
      // Twitter Card
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:url',
        content: 'https://moonrise-game.vercel.app',
      },
      {
        name: 'twitter:title',
        content: 'Moonrise - Social Deduction Game',
      },
      {
        name: 'twitter:description',
        content: 'A real-time multiplayer werewolf game. Trust no one.',
      },
      {
        name: 'twitter:image',
        content: 'https://moonrise-game.vercel.app/social-share.png',
      },
      {
        name: 'twitter:image:alt',
        content: 'Moonrise - Social Deduction. Trust No One.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      // Favicon
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '192x192',
        href: '/logo192.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        href: '/logo192.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        href: '/logo512.png',
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
