import { createFileRoute, Link } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const { data: session, isPending } = authClient.useSession()

  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.reload()
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      {session?.user ? (
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Welcome, {session.user.name}!</h1>
          <p className="text-muted-foreground">{session.user.email}</p>
          <Button onClick={handleSignOut} variant="outline">
            Sign out
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Welcome to Dental App</h1>
          <p className="text-muted-foreground">Please sign in to continue</p>
          <div className="flex gap-4 justify-center">
            <Link to="/login">
              <Button>Sign in</Button>
            </Link>
            <Link to="/signup">
              <Button variant="outline">Sign up</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
