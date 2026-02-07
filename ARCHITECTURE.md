# Architecture

TanStack Start + Convex + Better Auth starter template with SSR support and shadcn/ui.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (React 19) |
| Build | Vite 7 |
| Backend | Convex (realtime database + serverless functions) |
| Auth | Better Auth (email/password) |
| UI | shadcn/ui + Tailwind CSS |
| State | TanStack Query + Convex React hooks |

## Project Structure

```
├── convex/                    # Convex backend
│   ├── _generated/            # Auto-generated types (DO NOT EDIT)
│   ├── auth.ts                # Better Auth instance + getCurrentUser query
│   ├── auth.config.ts         # Auth provider configuration
│   ├── convex.config.ts       # Convex component config
│   ├── http.ts                # HTTP router (auth endpoints)
│   ├── schema.ts              # Database schema + role validator
│   └── userRoles.ts           # Role management functions
│
├── src/
│   ├── app/                   # File-based routes
│   │   ├── __root.tsx         # Root layout (providers, HTML shell)
│   │   ├── index.tsx          # Home page (/)
│   │   ├── login.tsx          # Login page
│   │   ├── signup.tsx         # Customer signup
│   │   ├── admin-signup.tsx   # Admin signup (with invite code)
│   │   ├── api.auth.$.ts      # Auth API catch-all route
│   │   ├── dashboard/
│   │   │   ├── route.tsx      # Dashboard layout (protected)
│   │   │   └── index.tsx      # Dashboard home
│   │   └── demo/              # Demo routes (can be deleted)
│   │
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   └── *.tsx              # App components (sidebar, nav, etc.)
│   │
│   ├── lib/
│   │   ├── auth-client.ts     # Client-side auth (authClient)
│   │   ├── auth-server.ts     # Server-side auth utilities
│   │   ├── utils.ts           # Utility functions (cn)
│   │   └── *.ts               # Other utilities
│   │
│   ├── middleware/
│   │   └── auth.ts            # Auth middleware for server functions
│   │
│   ├── server/
│   │   ├── auth.ts            # Server functions for route protection
│   │   └── functions.ts       # Example server functions
│   │
│   ├── router.tsx             # Router configuration
│   ├── routeTree.gen.ts       # Auto-generated route tree (DO NOT EDIT)
│   └── styles.css             # Global styles
│
├── public/                    # Static assets
├── .env.local                 # Environment variables (gitignored)
├── vite.config.ts             # Vite + TanStack Start config
└── package.json
```

## Convex Backend

### Schema (`convex/schema.ts`)

```ts
// Current tables
userRoles: {
  userId: string      // Better Auth user ID
  role: 'customer' | 'admin' | 'owner'
  createdAt: number
  updatedAt: number
}
```

### Adding New Tables

1. Define table in `convex/schema.ts`:
```ts
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // ... existing tables
  
  myTable: defineTable({
    userId: v.string(),
    title: v.string(),
    isComplete: v.boolean(),
  }).index('by_userId', ['userId']),
})
```

2. Run `npx convex dev` to sync schema

### Writing Convex Functions

Create a new file in `convex/`:

```ts
// convex/myFeature.ts
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { authComponent } from './auth'

// Query (read data)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error('Unauthorized')
    
    return ctx.db
      .query('myTable')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .collect()
  },
})

// Mutation (write data)
export const create = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error('Unauthorized')
    
    return ctx.db.insert('myTable', {
      userId: user._id,
      title: args.title,
      isComplete: false,
    })
  },
})
```

### Using Convex in Components

```tsx
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

function MyComponent() {
  const items = useQuery(api.myFeature.list)
  const createItem = useMutation(api.myFeature.create)
  
  const handleCreate = async () => {
    await createItem({ title: 'New item' })
  }
  
  if (items === undefined) return <Loading />
  
  return (
    <ul>
      {items.map(item => <li key={item._id}>{item.title}</li>)}
    </ul>
  )
}
```

### Convex Environment Variables

```bash
# View all env vars
npx convex env list

# Set an env var
npx convex env set ADMIN_INVITE_CODE "your-secret-code"

# Use in Convex functions
const code = process.env.ADMIN_INVITE_CODE
```

## Authentication Flow

### Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Client    │────▶│  TanStack Start  │────▶│   Convex    │
│  (Browser)  │     │   (SSR Server)   │     │  (Backend)  │
└─────────────┘     └──────────────────┘     └─────────────┘
      │                      │                      │
      │  authClient          │  fetchAuthQuery      │  authComponent
      │  (sign in/up/out)    │  (server functions)  │  (getAuthUser)
```

### Client-Side Auth

```tsx
import { authClient } from '@/lib/auth-client'

// Sign up
const result = await authClient.signUp.email({
  email: 'user@example.com',
  password: 'password123',
  name: 'User Name',
})

// Sign in
const result = await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password123',
})

// Sign out
await authClient.signOut()
window.location.reload() // Clean state

// Get session (reactive)
const { data: session } = authClient.useSession()
```

### Server-Side Auth (Route Protection)

```tsx
// src/app/protected/route.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUserServer } from '@/server/auth'

export const Route = createFileRoute('/protected')({\
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUserServer()
    
    if (!user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    
    return { user }
  },
  component: ProtectedComponent,
})

function ProtectedComponent() {
  // User is guaranteed to exist here
  const { user } = Route.useRouteContext()
  return <div>Welcome, {user.name}</div>
}
```

### Role-Based Authorization

```ts
// In Convex functions
export const adminOnlyMutation = mutation({
  args: { ... },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error('Unauthorized')
    
    const userRole = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', user._id))
      .first()
    
    if (userRole?.role !== 'admin' && userRole?.role !== 'owner') {
      throw new Error('Forbidden: Admin access required')
    }
    
    // Proceed with admin-only logic
  },
})
```

## TanStack Start (Framework Details)

TanStack Start is a full-stack React framework built on TanStack Router with SSR support.

### Key Concepts

| Concept | Description |
|---------|-------------|
| File-based routing | Routes are defined by file structure in `src/app/` |
| SSR | Server-side rendering by default |
| `beforeLoad` | Server-side data fetching and auth checks |
| `loader` | Route-specific data loading |
| Server Functions | RPC-style server calls with `createServerFn` |
| Middleware | Composable request/response handlers |

### Configuration (`vite.config.ts`)

```ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/start/plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tanstackStart({
      routers: {
        ssr: {
          entry: './src/app/ssr.tsx',
        },
        client: {
          entry: './src/app/client.tsx',
        },
      },
      tsr: {
        routesDirectory: 'src/app',         // Route files location
        generatedRouteTree: 'src/routeTree.gen.ts',
        quoteStyle: 'single',
        semicolons: false,
      },
    }),
  ],
})
```

### Root Layout (`src/app/__root.tsx`)

The root layout defines:
- HTML document structure (`shellComponent`)
- Global providers (Convex, Auth, etc.)
- Head metadata (title, viewport, stylesheets)
- 404 handler (`notFoundComponent`)

```tsx
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  beforeLoad: async () => {
    // Runs on every route, good for global auth token
    const token = await getAuth()
    return { initialToken: token }
  },
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})
```

## Routing

### Route Types

| Pattern | Example | Purpose |
|---------|---------|---------|
| `index.tsx` | `/dashboard/index.tsx` | Index route (`/dashboard`) |
| `route.tsx` | `/dashboard/route.tsx` | Layout wrapper (renders `<Outlet />`) |
| `[param].tsx` | `/users/[id].tsx` | Dynamic param (`/users/123`) |
| `[...slug].tsx` | `/docs/[...slug].tsx` | Catch-all (`/docs/a/b/c`) |
| `api.*.ts` | `/api.auth.$.ts` | API endpoint |
| `a.b.tsx` | `/demo/start.ssr.tsx` | Nested path (`/demo/start/ssr`) |
| `_layout.tsx` | `/_layout.tsx` | Pathless layout (groups routes) |

### Route Configuration Options

```tsx
export const Route = createFileRoute('/myroute')({
  // Component to render
  component: MyComponent,
  
  // Runs before route loads (SSR + client navigation)
  beforeLoad: async ({ context, location, params }) => {
    // Auth checks, redirects, context enrichment
    return { extraData: 'value' }
  },
  
  // Data loading (runs after beforeLoad)
  loader: async ({ context, params }) => {
    return await fetchData(params.id)
  },
  
  // Loading state while loader runs
  pendingComponent: () => <Spinner />,
  
  // Error boundary
  errorComponent: ({ error }) => <ErrorDisplay error={error} />,
  
  // 404 for this route
  notFoundComponent: () => <NotFound />,
  
  // Disable SSR for this route
  ssr: false,
  
  // Stale time for loader data (ms)
  staleTime: 10_000,
})
```

### Using Route Data

```tsx
function MyComponent() {
  // Access loader data
  const data = Route.useLoaderData()
  
  // Access context from beforeLoad
  const { user, extraData } = Route.useRouteContext()
  
  // Access route params
  const { id } = Route.useParams()
  
  // Access search params (?query=value)
  const { query } = Route.useSearch()
  
  return <div>{data.title}</div>
}
```

### Navigation

```tsx
import { Link, useNavigate, useRouter } from '@tanstack/react-router'

// Declarative link
<Link to="/dashboard" search={{ tab: 'settings' }}>
  Dashboard
</Link>

// Programmatic navigation
const navigate = useNavigate()
navigate({ to: '/login', search: { redirect: location.href } })

// Router instance (for redirects in handlers)
const router = useRouter()
router.navigate({ to: '/dashboard' })
```

### Creating a Protected Route

```tsx
// src/app/admin/route.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getCurrentUserServer, getMyRoleServer } from '@/server/auth'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const [user, role] = await Promise.all([
      getCurrentUserServer(),
      getMyRoleServer(),
    ])
    
    if (!user) throw redirect({ to: '/login' })
    if (role !== 'admin' && role !== 'owner') {
      throw redirect({ to: '/dashboard' })
    }
    
    return { user, role }
  },
  component: () => <Outlet />,
})
```

## Server Functions

Server functions are RPC-style calls that run on the server.

### Basic Server Function

```tsx
import { createServerFn } from '@tanstack/react-start'

const myServerFn = createServerFn({ method: 'POST' })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    // This runs on the server
    // Can access databases, env vars, etc.
    return { message: `Hello, ${data.name}!` }
  })

// Use in component
function MyComponent() {
  const handleClick = async () => {
    const result = await myServerFn({ data: { name: 'World' } })
    console.log(result.message) // "Hello, World!"
  }
}
```

### Server Function with Middleware

```tsx
import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/middleware/auth'

const protectedFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((data: { title: string }) => data)
  .handler(async ({ data, context }) => {
    // context.user is available from middleware
    return { created: true }
  })
```

### Accessing Request/Response

```tsx
import { createServerFn } from '@tanstack/react-start'
import { getHeaders, getWebRequest } from '@tanstack/react-start/server'

const serverFn = createServerFn().handler(async () => {
  const request = getWebRequest()
  const headers = getHeaders()
  
  // Access cookies, headers, etc.
  const userAgent = headers.get('user-agent')
  
  return { userAgent }
})
```

## Middleware

Middleware composes functionality for server functions.

```tsx
import { createMiddleware } from '@tanstack/react-start'

export const loggingMiddleware = createMiddleware({ type: 'function' })
  .client(async ({ next }) => {
    console.log('Client: request starting')
    const result = await next()
    console.log('Client: request complete')
    return result
  })
  .server(async ({ next }) => {
    console.log('Server: processing')
    const result = await next({
      context: { timestamp: Date.now() },
    })
    return result
  })
```

## API Routes

For REST-style endpoints:

```ts
// src/app/api.users.ts
import { createFileRoute, json } from '@tanstack/react-router'

export const Route = createFileRoute('/api/users')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const users = await fetchUsers()
        return json(users)
      },
      POST: async ({ request }) => {
        const body = await request.json()
        const user = await createUser(body)
        return json(user, { status: 201 })
      },
    },
  },
})
```

## SSR Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| Full SSR | Server renders HTML | SEO, fast initial load |
| `ssr: false` | Client-only rendering | Auth-gated pages, heavy interactivity |
| Streaming | Progressive HTML streaming | Large pages |

```tsx
// Disable SSR for a route
export const Route = createFileRoute('/client-only')({
  ssr: false,
  component: ClientOnlyComponent,
})
```

## Head Management

Per-route metadata:

```tsx
export const Route = createFileRoute('/blog/$slug')({
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData.post.title },
      { name: 'description', content: loaderData.post.excerpt },
      { property: 'og:title', content: loaderData.post.title },
    ],
  }),
  loader: async ({ params }) => {
    const post = await getPost(params.slug)
    return { post }
  },
  component: BlogPost,
})
```

## Adding UI Components

```bash
# Add shadcn/ui components
npx shadcn@latest add button
npx shadcn@latest add card dialog form input

# List available components
npx shadcn@latest add
```

Usage:
```tsx
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Card</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => {}}>Click me</Button>
      </CardContent>
    </Card>
  )
}
```

## Development Workflow

### Local Development

```bash
# Terminal 1: Start Convex backend
npx convex dev

# Terminal 2: Start TanStack Start dev server
npm run dev
```

### Deployment

1. **Deploy Convex**:
```bash
npx convex deploy
```

2. **Set production env vars**:
```bash
npx convex env set BETTER_AUTH_SECRET "your-production-secret"
npx convex env set ADMIN_INVITE_CODE "your-admin-code"
```

3. **Deploy frontend** (Vercel, Netlify, etc.):
   - Set env vars: `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, `SITE_URL`

## Common Tasks

### Add a New Feature

1. Add table to `convex/schema.ts`
2. Create `convex/myFeature.ts` with queries/mutations
3. Run `npx convex dev` to sync
4. Create route in `src/app/myFeature/`
5. Use `api.myFeature.*` in components

### Add Admin-Only Page

1. Create `src/app/admin/route.tsx` with role check in `beforeLoad`
2. Create `src/app/admin/index.tsx` for content
3. Add navigation link (conditionally shown based on role)

### Modify User Roles

Edit `convex/schema.ts` to add new role literals:
```ts
export const roleValidator = v.union(
  v.literal('customer'),
  v.literal('admin'),
  v.literal('owner'),
  v.literal('newRole'),  // Add new role
)

export type Role = 'customer' | 'admin' | 'owner' | 'newRole'
```

## Troubleshooting

### "Unauthorized" errors
- Check that user is logged in
- Verify `authComponent.getAuthUser(ctx)` is called in Convex function
- Check route has `beforeLoad` protection

### Convex not syncing
- Ensure `npx convex dev` is running
- Check for schema errors in terminal
- Run `npx convex dev --once` to force sync

### Auth not working after deploy
- Verify `BETTER_AUTH_SECRET` is set in Convex env
- Check `SITE_URL` matches production domain
- Verify `trustedOrigins` in `convex/auth.ts`
