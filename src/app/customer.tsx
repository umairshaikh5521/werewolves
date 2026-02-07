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

export const Route = createFileRoute('/customer')({
  component: CustomerPage,
  ssr: false, // Client-side only for Convex
})

function CustomerPage() {
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
  const isCustomer = userRole === 'customer'

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

  if (!isCustomer) {
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
                <strong>Customer</strong> role.
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
          <h1 className="text-3xl font-bold">Customer Portal</h1>
          <Link to="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-700">
              ✅ Customer Access Granted
            </CardTitle>
            <CardDescription>
              Welcome to your patient portal, {session.user.name}!
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
            <CardTitle>Customer Features</CardTitle>
            <CardDescription>
              As a customer (patient), you have access to the following
              features:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>View and book appointments</li>
              <li>View your patient records</li>
              <li>View treatment history</li>
              <li>View billing information</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Appointments</CardTitle>
            <CardDescription>Your upcoming appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              No upcoming appointments scheduled.
            </p>
            <Button disabled>Book Appointment (Coming Soon)</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
