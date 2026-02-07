import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
  ssr: false, // Client-side only for Convex
})

function AdminPage() {
  const navigate = useNavigate()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const userId = session?.user?.id
  const role = useQuery(api.userRoles.getUserRole, userId ? { userId } : 'skip')
  const rolePending = role === undefined

  const isPending = sessionPending || (userId && rolePending)

  useEffect(() => {
    if (!sessionPending && !session?.user) {
      navigate({ to: '/login' })
    }
  }, [session, sessionPending, navigate])

  // Role-based access
  const userRole = role || 'customer'
  const isAdmin = userRole === 'admin'

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Access Denied</CardTitle>
              <CardDescription>
                You do not have permission to access this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                This page is only accessible to users with the{' '}
                <strong>Admin</strong> role.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Your current role: <strong>{userRole}</strong>
              </p>
              <Link to="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <Link to="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">
              ✅ Admin Access Granted
            </CardTitle>
            <CardDescription>
              Welcome to the admin panel, {session.user.name}!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <p className="font-medium">Your Role:</p>
              <p className="text-muted-foreground capitalize">{userRole}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Features</CardTitle>
            <CardDescription>
              As an admin, you have access to the following features:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Manage appointments (create, update, delete)</li>
              <li>Manage patient records</li>
              <li>Manage treatment plans</li>
              <li>View and manage billing</li>
              <li>Access admin-only reports</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button disabled>Add Patient (Coming Soon)</Button>
            <Button disabled variant="outline">
              View Reports (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
