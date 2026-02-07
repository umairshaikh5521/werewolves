import {
  createFileRoute,
  Outlet,
  redirect,
  useRouteContext,
} from '@tanstack/react-router'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { Separator } from '@/components/ui/separator'
import { getCurrentUserServer, getMyRoleServer } from '@/server/auth'

export const Route = createFileRoute('/dashboard')({
  // Server-side auth check - runs on SSR and client navigation
  beforeLoad: async ({ location }) => {
    const [user, role] = await Promise.all([
      getCurrentUserServer(),
      getMyRoleServer(),
    ])

    if (!user) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }

    // Pass user and role to child routes via context
    return { user, role: role ?? 'customer' }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  // User data is available via context for child routes
  // Access with useRouteContext({ from: '/dashboard' }) in children
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ctx = useRouteContext({ from: '/dashboard' })

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
