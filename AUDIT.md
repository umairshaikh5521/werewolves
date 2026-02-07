# TanStack Start + Convex Audit
Date: 2026-01-28
Scope: `src/` (TanStack Start) + `convex/` (Convex backend) + Better Auth integration

## 1. Executive Summary
This codebase is an early-stage scaffold with **severe, must-fix security gaps** around authentication/authorization and role assignment.

The biggest problem: **nearly all access control is client-driven**, while the Convex backend functions are effectively public. This creates straightforward privilege escalation paths (become admin) and makes it unsafe to ship.

Architecturally, the app currently mixes (and partially configures) **two different Convex data-fetch approaches**:
- `convex/react` realtime hooks (currently used)
- `@convex-dev/react-query` TanStack Query integration (configured in `src/router.tsx` but not actually used in routes/components)

In addition, the frontend is using **`ConvexProvider` without Better Auth → Convex auth bridging**, which incentivized the current anti-pattern of “pass `userId` from the client” and prevents proper server-enforced identity.

Net: **security is Critical**, maintainability is **Medium**, and performance is **Medium** (mostly due to avoidable extra clients/devtools and lack of SSR-aware auth gating).

## 2. Critical Issues (Must Fix)

### Critical — Privilege escalation: any user can make themselves admin
**Where**
- `convex/userRoles.ts` (`setUserRole` mutation)
- `src/app/admin-signup.tsx` (hardcoded client-side “admin code” + calls `setUserRole`)

**What / Why it matters**
- `setUserRole` accepts arbitrary `{ userId, role }` and performs **no auth** and **no authorization checks**.
- Any client can call this mutation and set **their own role** (or someone else’s) to `admin`.
- The “admin verification code” is hardcoded in the client, so it provides **zero protection**.

**Concrete fix**
- Make role assignment server-enforced:
  - Change `setUserRole` to not accept `userId` from the client.
  - Resolve the current user inside Convex via Better Auth:
    - `const user = await authComponent.getAuthUser(ctx)`
  - Only allow safe self-assignment (e.g., auto-assign `customer` once) and require an **admin-only** path for promotions.
- Remove `/admin-signup` from production. If you need staff onboarding:
  - Use invite links/codes stored server-side (Convex env var), verified in a Convex mutation.
  - Prefer “existing owner/admin promotes another user”.

**Minimal implementation sketch (Convex)**
```ts
// convex/userRoles.ts
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { authComponent } from './auth'

const Role = v.union(v.literal('customer'), v.literal('admin'), v.literal('owner'))

export const ensureMyRole = mutation({
  args: { role: Role },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error('Unauthorized')

    // Allow only safe self-assignment here (example: customer only)
    if (args.role !== 'customer') throw new Error('Forbidden')

    const now = Date.now()
    const existing = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', user.id))
      .first()

    if (existing) return existing._id

    return ctx.db.insert('userRoles', {
      userId: user.id,
      role: 'customer',
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const setRoleForUser = mutation({
  args: {
    userId: v.string(),
    role: Role,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error('Unauthorized')

    // Authorize the *caller* (example: must be admin/owner)
    const callerRole = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', user.id))
      .first()

    if (!callerRole || (callerRole.role !== 'admin' && callerRole.role !== 'owner')) {
      throw new Error('Forbidden')
    }

    // Then set/patch the target user's role (args.userId)
    // ...
  },
})
```

### Critical — All authorization checks are client-side (easily bypassed)
**Where**
- `src/app/admin.tsx`, `src/app/customer.tsx`, `src/app/dashboard/route.tsx`
- `src/middleware/routeAuth.ts` (exists but not used; also insecure)

**What / Why it matters**
- Redirecting in `useEffect` and hiding UI behind skeletons does not protect data.
- A malicious client can still call Convex functions directly.
- If you later add sensitive Convex queries/mutations and forget server enforcement, you will leak data.

**Concrete fix**
- Enforce auth/authorization on the **server side**:
  - In Convex functions: verify auth and role at the top of every query/mutation.
  - In TanStack Start routes: use route `beforeLoad` to redirect unauthenticated users on both SSR and navigation.

### Critical — “Protected server functions” are not protected (false sense of security)
**Where**
- `src/middleware/auth.ts` (`authMiddleware`)
- `src/server/functions.ts` (`getProtectedData`, `updateProfile`)

**What / Why it matters**
- `authMiddleware.server()` currently sets `{ isAuthenticated: true }` unconditionally.
- Client-side checks can be bypassed by calling the server function endpoint directly.
- This is dangerous because it looks “secured” but isn’t.

**Concrete fix**
- Delete the demo server functions if not used.
- If you keep server functions, verify auth on the server by using Better Auth + Convex Start helpers (`getToken`, `fetchAuthQuery`, etc.).
- Do not use “presence of a cookie string” to claim auth.

### Critical — Convex client is not wired to Better Auth (blocks real server-side identity)
**Where**
- `src/app/__root.tsx` uses `ConvexProvider` with `new ConvexReactClient(...)`

**What / Why it matters**
- With Better Auth + Convex, the intended pattern is to **authenticate the Convex client** via Better Auth.
- Right now, Convex hooks (`useQuery`, `useMutation`) are effectively unauthenticated.
- That’s why you’re passing `userId` around manually (which is an anti-pattern and security footgun).

**Concrete fix**
- Replace `ConvexProvider` with Better Auth’s Convex-authenticated provider:
  - Use `ConvexBetterAuthProvider` from `@convex-dev/better-auth/react`.
  - Provide it the same `authClient` you already use.

**Minimal implementation sketch (TanStack Start root)**
```tsx
// src/app/__root.tsx
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { ConvexReactClient } from 'convex/react'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { authClient } from '@/lib/auth-client'

const convexClient = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!)

function RootComponent() {
  return (
    <ConvexBetterAuthProvider client={convexClient} authClient={authClient}>
      <Outlet />
    </ConvexBetterAuthProvider>
  )
}
```

## 3. TanStack Start Findings

### High — Missing server-side route protection (`beforeLoad`)
**Where**
- `/dashboard` is protected via client-side redirect only (`src/app/dashboard/route.tsx`)

**Why it matters**
- Users can hit protected routes and receive a 200 response with “loading” content.
- More importantly, the pattern doesn’t scale: once you add server-side data loaders, you’ll likely fetch sensitive data without proper gating.

**Suggested pattern**
- Create a small `createServerFn` helper that checks auth on the server and returns user/session.
- Use it from `beforeLoad` to redirect.

**Minimal implementation sketch (server-enforced redirect)**
```ts
// src/server/auth.ts
import { createServerFn } from '@tanstack/react-start'
import { fetchAuthQuery } from '@/lib/auth-server'
import { api } from '../../convex/_generated/api'

export const getCurrentUserServer = createServerFn().handler(async () => {
  return fetchAuthQuery(api.auth.getCurrentUser)
})
```

```tsx
// src/app/dashboard/route.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUserServer } from '@/server/auth'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const user = await getCurrentUserServer()
    if (!user) {
      throw redirect({ to: '/login' })
    }
  },
})
```

### High — Request middleware exists but is insecure and unused
**Where**
- `src/middleware/routeAuth.ts`

**Issues**
- It checks `cookieHeader.includes('better-auth.session')` which is not a valid auth check.
- It isn’t applied to routes, so it currently provides no protection.

**Fix**
- Either remove it (avoid false confidence), or re-implement it using Better Auth + Start server headers (see `src/lib/auth-server.ts` exports).

### Medium — Devtools are mounted unconditionally
**Where**
- `src/app/__root.tsx`

**Why it matters**
- Devtools add bundle weight and can expose internal state/route info.

**Fix**
- Gate `TanStackDevtools` behind `import.meta.env.DEV`.

### Medium — Env usage inconsistency (`process.env` vs `import.meta.env`)
**Where**
- `src/router.tsx` uses `process.env.VITE_CONVEX_URL!`
- `src/app/__root.tsx` uses `import.meta.env.VITE_CONVEX_URL!`

**Why it matters**
- In Vite/client code, `process.env.*` is not the standard mechanism.

**Fix**
- Use `import.meta.env` consistently for client-side values.

### Low — Project docs mismatch
**Where**
- `README.md` references `src/routes`, but your app uses `src/app`.
- `AGENTS.md` path for auth route doesn’t match actual filename.

**Fix**
- Update docs to match the repo.

## 4. Convex Findings

### Critical — Role assignment must be authorization-enforced
**Where**
- `convex/userRoles.ts:setUserRole`

**Fix direction**
- Split responsibilities:
  1. `ensureMyRole()` (authenticated) — sets current user’s role to `customer` if missing.
  2. `setRoleForUser()` (admin-only) — can promote/demote other users.

### High — `getUserRole(userId)` leaks data + enables client-driven auth logic
**Where**
- `convex/userRoles.ts:getUserRole`

**Why it matters**
- It encourages UI-driven permission decisions and exposes role info for arbitrary users.

**Fix**
- Prefer `getMyRole()` only.
- If admins need to read others’ roles, create an admin-only query.

### Medium — Schema should validate role values
**Where**
- `convex/schema.ts` role is `v.string()`

**Why it matters**
- Weak typing at the boundary makes privilege escalation bugs easier.

**Fix**
- Use `v.union(v.literal('admin'), v.literal('customer'), v.literal('owner'))` (whatever your real roles are).

**Example**
```ts
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const Role = v.union(v.literal('customer'), v.literal('admin'), v.literal('owner'))

export default defineSchema({
  userRoles: defineTable({
    userId: v.string(),
    role: Role,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),
})
```

### Medium — Avoid dynamic imports in Convex functions
**Where**
- `convex/userRoles.ts:getMyRole` dynamically imports `./auth`

**Why it matters**
- It’s unnecessary complexity and can hide circular dependency issues.

**Fix**
- Import `authComponent` once at module scope.

## 5. Performance Improvements

### Medium — Avoid multiple Convex clients / duplicated realtime connections
**Where**
- `src/router.tsx` constructs a `ConvexQueryClient`
- `src/app/__root.tsx` constructs a separate `ConvexReactClient`

**Why it matters**
- Multiple clients can mean duplicated websocket connections and harder debugging.

**Fix**
- Choose one approach:
  - If you stick with `convex/react` hooks, create one authenticated Convex client/provider.
  - If you move to `@convex-dev/react-query`, follow the quickstart pattern and use `convexQueryClient.convexClient` for the provider.

### Medium — Remove or gate demo routes and server functions
**Where**
- `src/app/demo/*`
- `src/server/functions.ts`

**Why it matters**
- Shipping demo endpoints/routes increases bundle size and attack surface.

### Low — Reduce repeated session reads across pages
**Where**
- Many routes call `authClient.useSession()` separately

**Fix**
- Centralize session into route context or a top-level component and pass down minimal state.

## 6. Best Practice Recommendations

### Adopt a single “source of truth” for identity + roles
- Use Better Auth for session.
- Use Convex auth (through Better Auth’s Convex provider) as the canonical identity inside Convex.
- Store roles in Convex, but compute “current role” from `ctx` identity (no client-passed user IDs).

### Standardize patterns
- `beforeLoad` for route protection (server-enforced redirect).
- Convex functions:
  - Always validate args.
  - Always check auth first.
  - Authorization logic lives in Convex, not in React.

### Logging hygiene
- Remove `console.log` from server middleware and profile updates before production.
- Avoid logging PII (email/name) in server logs.

## 7. Optional Enhancements (DX / Scalability)

### Better Auth + Convex: add an auth boundary for reactive redirects
- Consider using the provided auth boundary component to catch auth errors and redirect (useful once Convex functions start enforcing auth).

### Improve SEO / metadata and LLM optimization
- Update `<title>` and add description/OG meta tags (currently still “TanStack Start Starter”).
- If you care about AI-assisted discovery, follow TanStack Start’s LLM optimization guide.

---
## References (docs consulted)
- TanStack Start (React) guide: LLM Optimization (LLMO)
  - https://tanstack.com/start/latest/docs/framework/react/guide/llmo
- TanStack Start guide: Authentication
  - https://tanstack.com/start/latest/docs/framework/react/guide/authentication
- TanStack Start guide: Middleware
  - https://tanstack.com/start/latest/docs/framework/react/guide/middleware
- Convex docs index (llms.txt)
  - https://docs.convex.dev/llms.txt
- Convex docs: Auth in Functions
  - https://docs.convex.dev/functions-auth
- Convex docs: Validation
  - https://docs.convex.dev/functions-validation
- Convex docs: TanStack Start + Convex quickstart
  - https://docs.convex.dev/quickstarts/tanstack-start
- Convex docs: TanStack Query integration
  - https://docs.convex.dev/client/tanstack-query
