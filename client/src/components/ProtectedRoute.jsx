import { useState, useEffect } from 'react'
import { Navigate }            from 'react-router-dom'
import api                     from '../lib/axios'
import { useUIStore }          from '../store/uistore'
import AccessDenied            from './AccessDenied'

/**
 * ProtectedRoute — wraps any route that requires authentication.
 *
 * What it does:
 *   1. Calls /api/me to validate the httpOnly cookie session
 *   2. Syncs the user's role into Zustand
 *   3. If allowedRoles is provided, checks the user's role against the list
 *   4. Redirects to /login on 401, shows AccessDenied on 403
 *
 * Usage:
 *   // Any authenticated user
 *   <ProtectedRoute><Dashboard /></ProtectedRoute>
 *
 *   // Admin only
 *   <ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>
 *
 *   // Multiple roles
 *   <ProtectedRoute allowedRoles={['admin', 'user']}><Page /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const [status,   setStatus]   = useState('checking')  // 'checking' | 'ok' | 'denied'
  const [userRole, setUserRole] = useState(null)
  const { setRole }             = useUIStore()

  useEffect(() => {
    api.get('/me')
      .then(({ data }) => {
        setRole(data.role)      // sync into Zustand for UI decisions
        setUserRole(data.role)
        setStatus('ok')
      })
      .catch(() => setStatus('denied'))
  }, [setRole])

  // Spinner while validating session
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  // No valid session → redirect to login
  if (status === 'denied') return <Navigate to="/login" replace />

  // Valid session but role not allowed → 403 page
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <AccessDenied requiredRole={allowedRoles[0]} />
  }

  return children
}