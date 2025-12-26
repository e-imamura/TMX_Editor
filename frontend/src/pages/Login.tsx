import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/services/api'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { login, register } = useAuth()
  const [username, setUsername] = useState('demo')
  const [password, setPassword] = useState('demo')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const userRef = useRef<HTMLInputElement>(null)

  useEffect(() => { userRef.current?.focus() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      if (mode === 'register') {
        await register(username.trim(), password)
      }
      await login(username.trim(), password)
      navigate('/')
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : 'Falha inesperada. Tente novamente.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => { setMode((m) => (m === 'login' ? 'register' : 'login')); setError(null) }
  const canSubmit = username.trim().length > 0 && password.length > 0 && !loading

  return (
    <div className="card" role="region" aria-label="Autenticação de usuário">
      <h2>{mode === 'login' ? 'Entrar' : 'Criar conta'}</h2>

      <form onSubmit={submit} noValidate>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div>
            <label htmlFor="username" className="muted">Usuário</label>
            <input id="username" ref={userRef} placeholder="usuário" value={username}
              onChange={(e) => setUsername(e.target.value)} autoComplete="username" aria-invalid={username.trim().length === 0} />
          </div>

          <div>
            <label htmlFor="password" className="muted">Senha</label>
            <input id="password" placeholder="senha" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} aria-invalid={password.length === 0} />
          </div>

          <div className="row">
            <button type="submit" disabled={!canSubmit}>
              {loading ? (mode === 'login' ? 'Entrando...' : 'Registrando...') : (mode === 'login' ? 'Entrar' : 'Registrar e entrar')}
            </button>
            <button type="button" className="btn-secondary" onClick={toggleMode} disabled={loading}>
              {mode === 'login' ? 'Criar conta' : 'Já tenho conta'}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" style={{ color: 'var(--error)', marginTop: '0.5rem' }}>{error}</p>
        )}
      </form>

      <div className="space" />
      <p className="muted">Dica: use <code>demo/demo</code> para testar rapidamente.</p>
    </div>
  )
}
