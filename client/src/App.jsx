import { Routes, Route, Navigate } from 'react-router-dom'
import Login          from './pages/Login'
import Dashboard      from './pages/Dashboard'
import LogExplorer    from './pages/LogExplorer'
import ProtectedRoute from './components/ProtectedRoute'

/**
 * App — routes only.
 * Auth logic lives in ProtectedRoute.
 * 403 logic lives in AccessDenied.
 *
 * To restrict a route to admin only:
 *   <ProtectedRoute allowedRoles={['admin']}><Page /></ProtectedRoute>
 */
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected — open to all roles for now */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/explorer" element={
        <ProtectedRoute allowedRoles={['admin']}><LogExplorer /></ProtectedRoute>
      } />

      {/* Catch-all → login */}
      <Route path="/"  element={<Navigate to="/login" replace />} />
      <Route path="*"  element={<Navigate to="/login" replace />} />
    </Routes>
  )
}