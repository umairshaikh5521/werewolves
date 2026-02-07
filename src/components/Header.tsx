import { Link } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'

import './Header.css'

export default function Header() {
  const { data: session } = authClient.useSession()

  return (
    <header className="header">
      <nav className="nav">
        <div className="nav-item">
          <Link to="/">Home</Link>
        </div>

        {session?.user ? (
          <div className="px-2 font-bold">
            <Link to="/dashboard">Dashboard</Link>
          </div>
        ) : (
          <>
            <div className="px-2 font-bold">
              <Link to="/login">Login</Link>
            </div>
            <div className="px-2 font-bold">
              <Link to="/signup">Sign Up</Link>
            </div>
          </>
        )}
      </nav>
    </header>
  )
}
