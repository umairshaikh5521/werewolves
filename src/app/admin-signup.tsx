import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/admin-signup')({
  component: AdminSignupPage,
  ssr: false, // Client-side only for auth
})

function AdminSignupPage() {
  const router = useRouter()
  // Use server-validated invite code mutation
  const claimAdminWithInviteCode = useMutation(api.userRoles.claimAdminWithInviteCode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!inviteCode.trim()) {
      setError('Invite code is required')
      return
    }

    setLoading(true)

    try {
      // Sign up user with Better Auth
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      })

      if (result.error) {
        setError(result.error.message || 'Failed to create account')
        setLoading(false)
        return
      }

      // Claim admin role with server-validated invite code
      // The code is validated on the server against ADMIN_INVITE_CODE env var
      try {
        await claimAdminWithInviteCode({ inviteCode: inviteCode.trim() })
      } catch (claimError) {
        // If invite code is invalid, the user is created but not an admin
        // They can still use the app as a customer
        const errorMessage = claimError instanceof Error ? claimError.message : 'Invalid invite code'
        setError(errorMessage)
        setLoading(false)
        return
      }

      router.navigate({ to: '/dashboard' })
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Admin Sign Up
          </CardTitle>
          <CardDescription className="text-center">
            Create your clinic staff account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div className="p-3 text-sm text-blue-700 bg-blue-50 rounded-md">
              Admin accounts have full access to manage appointments, patients,
              and billing. You need a verification code to create an admin
              account.
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Admin Invite Code</Label>
              <Input
                id="inviteCode"
                type="password"
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Contact your clinic administrator for an invite code
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Admin Account'}
            </Button>
            <div className="text-sm text-center space-y-2">
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
              <p className="text-muted-foreground">
                Not clinic staff?{' '}
                <Link to="/signup" className="text-primary hover:underline">
                  Customer Sign Up
                </Link>
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
