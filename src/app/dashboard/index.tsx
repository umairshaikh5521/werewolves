import { createFileRoute, Link, useRouteContext } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  // Get user and role from parent route context (set in beforeLoad)
  const { user, role } = useRouteContext({ from: '/dashboard' })

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          // Reload page to clear Convex auth state
          window.location.href = '/'
        },
      },
    })
  }

  const isAdmin = role === 'admin' || role === 'owner'
  const isCustomer = role === 'customer'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={handleSignOut} variant="outline">
          Sign out
        </Button>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {user?.name}!</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <strong>Email:</strong> {user?.email}
          </p>
        </CardContent>
      </Card>

      {/* Role Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Role</CardTitle>
          <CardDescription>Role-based access control</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">Current Role:</p>
            <p className="text-muted-foreground capitalize text-lg">
              {role}
            </p>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Role-based Access:</p>
            <div className="flex gap-2">
              <Link to="/admin">
                <Button
                  variant={isAdmin ? 'default' : 'outline'}
                  size="sm"
                >
                  Admin Panel {isAdmin ? '✓' : '🔒'}
                </Button>
              </Link>
              <Link to="/customer">
                <Button
                  variant={isCustomer ? 'default' : 'outline'}
                  size="sm"
                >
                  Customer Portal {isCustomer ? '✓' : '🔒'}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
