import React, { createContext, useContext, useMemo, useState } from 'react'

type AuthContextType = { token: string | null; login: (u: string, p: string) => Promise<void>; register: (u: string, p: string) => Promise<void>; logout: () => void }
const AuthContext = createContext<AuthContextType>({ token: null, login: async ()=>{}, register: async ()=>{}, logout: ()=>{} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
    if (!res.ok) throw new Error('Login falhou: ' + res.status)
    const data = await res.json(); localStorage.setItem('token', data.token); setToken(data.token)
  }
  const register = async (username: string, password: string) => {
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
    if (!res.ok) throw new Error('Registro falhou: ' + res.status)
  }
  const logout = () => { localStorage.removeItem('token'); setToken(null) }
  const value = useMemo(() => ({ token, login, register, logout }), [token])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
export async function apiGet(path: string) { const token = localStorage.getItem('token'); const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); if (!res.ok) throw new Error('HTTP ' + res.status); return res.json() }
export async function apiPost(path: string, body: any) { const token = localStorage.getItem('token'); const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }); if (!res.ok) throw new Error('HTTP ' + res.status); return res.json() }
