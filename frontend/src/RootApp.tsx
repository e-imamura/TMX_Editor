import React from 'react'
import { AuthProvider } from '@/services/api'
import App from './App'

export default function RootApp() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}
