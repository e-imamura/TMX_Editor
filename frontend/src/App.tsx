import React from 'react'
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import { useAuth } from '@/services/api'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <>
      <header>
        <h1>TMX Platform</h1>
        <nav className="row">
          <Link to="/">Dashboard</Link>
          {!token ? (
            <Link className="right" to="/login">Login</Link>
          ) : (
            <button className="right" onClick={() => { logout(); navigate('/login') }}>Sair</button>
          )}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        </Routes>
      </main>
    </>
  )
}
