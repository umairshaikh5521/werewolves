# AGENTS.md

This file provides guidance to AI agents (Warp, Cursor, etc.) when working with code in this repository.

## Commands

```bash
npm run dev           # Start dev server on port 3000
npm run build         # Build for production
npm run test          # Run tests with Vitest
npm run preview       # Preview production build
npx convex dev        # Start Convex backend (run in separate terminal)
npx convex dashboard  # Open Convex dashboard
npx convex env set KEY "value"  # Set Convex environment variable
```

## Architecture Overview

**TanStack Start** application with:
- React 19, Vite 7, file-based routing with SSR
- **Convex** as the realtime backend
- **Better Auth** for authentication (email/password)
- **shadcn/ui** for UI components

See `ARCHITECTURE.md` for detailed project structure.

## Key Patterns

### Path Alias
`@/` → `./src/` (e.g., `import { Button } from '@/components/ui/button'`)

### Auto-Generated Files (DO NOT EDIT)
- `src/routeTree.gen.ts` - Route tree
- `convex/_generated/` - Convex types

## Authentication & Authorization

### Security Model
All authentication and authorization is **server-enforced**:
- Convex mutations/queries validate auth via `authComponent.getAuthUser(ctx)`
- Routes use `beforeLoad` with server functions for SSR-safe protection
- Role assignments happen server-side only (no client-passed userIds)

### Auth Flow
```tsx
// Client-side auth actions
import { authClient } from '@/lib/auth-client'

await authClient.signUp.email({ email, password, name })
await authClient.signIn.email({ email, password })
await authClient.signOut()
```

### Protected Routes
Use `beforeLoad` with server functions:
```tsx
import { getCurrentUserServer } from '@/server/auth'

export const Route = createFileRoute('/protected')({
  beforeLoad: async () => {
    const user = await getCurrentUserServer()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
})
```

### Convex Functions with Auth
```ts
import { authComponent } from './auth'

export const myMutation = mutation({
  args: { ... },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error('Unauthorized')
    // user._id is the authenticated user's ID
  },
})
```

### Role Management
- `api.userRoles.getMyRole` - Get current user's role
- `api.userRoles.ensureMyRole` - Self-assign customer role (signup)
- `api.userRoles.setRoleForUser` - Admin-only role assignment
- `api.userRoles.claimAdminWithInviteCode` - Claim admin with server-validated code

Roles: `'customer' | 'admin' | 'owner'`

### Environment Variables

**.env.local** (local development):
```
CONVEX_DEPLOYMENT=your-deployment
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-deployment.convex.site
SITE_URL=http://localhost:3000
```

**Convex Environment** (set via `npx convex env set`):
- `BETTER_AUTH_SECRET` - Auth secret (required for production)
- `ADMIN_INVITE_CODE` - Server-side admin registration code

## Routing Patterns

### Page Routes
```tsx
export const Route = createFileRoute('/path')({
  component: MyComponent,
  beforeLoad: async () => { /* auth checks */ },
  loader: async () => fetchData(),
})
```

### API Routes
```tsx
export const Route = createFileRoute('/api/endpoint')({
  server: {
    handlers: {
      GET: () => json({ data: 'value' }),
    },
  },
})
```

### Server Functions
```tsx
const myServerFn = createServerFn({ method: 'POST' })
  .inputValidator((d: MyType) => d)
  .handler(async ({ data }) => { /* server code */ })
```

### File Naming
- `index.tsx` - Index route
- `__root.tsx` - Root layout
- `route.tsx` - Layout route (wraps children)
- `api.*.ts` - API-only routes
- Dot notation: `start.ssr.tsx` → `/start/ssr`

## UI Components (shadcn/ui)

```bash
npx shadcn@latest add button card dialog  # Add components
```

Components: `src/components/ui/`
Utility: `cn()` from `src/lib/utils.ts`

## Key Files Reference

| File | Purpose |
|------|---------|  
| `convex/auth.ts` | Better Auth instance, `getCurrentUser` query |
| `convex/userRoles.ts` | Role management mutations/queries |
| `convex/schema.ts` | Database schema with role validator |
| `src/lib/auth-client.ts` | Client-side auth actions |
| `src/lib/auth-server.ts` | Server-side auth utilities |
| `src/server/auth.ts` | Server functions for route protection |
| `src/middleware/auth.ts` | Auth middleware for server functions |
| `src/app/__root.tsx` | Root layout with ConvexBetterAuthProvider |

## Security Audit

A comprehensive security audit was performed (see `AUDIT.md`). All critical issues have been addressed:

✅ Server-enforced authentication in all Convex functions  
✅ Typed role validation at database level  
✅ SSR-safe route protection via `beforeLoad`  
✅ Admin invite code validated server-side (Convex env var)  
✅ No client-passed userIds in mutations  
✅ Proper `ConvexBetterAuthProvider` wiring  

## Demo Files

Files in `src/app/demo/` and `src/data/demo.*` are examples and can be safely deleted.
