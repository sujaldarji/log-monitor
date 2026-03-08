import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import api       from './lib/axios'
import Login     from './pages/Login'
import Dashboard from './pages/Dashboard'
import LogExplorer from './pages/LogExplorer'

const ProtectedRoute = ({ children }) => {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    api.get('/me')
      .then(() => setStatus('ok'))
      .catch(() => setStatus('denied'))
  }, [])

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'denied') return <Navigate to="/login" replace />

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/explorer" element={
        <ProtectedRoute><LogExplorer /></ProtectedRoute>
      } />

      <Route path="/"  element={<Navigate to="/login" replace />} />
      <Route path="*"  element={<Navigate to="/login" replace />} />
    </Routes>
  )
}