import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import RootApp from './RootApp'
import './App.css'

const el = document.getElementById('root')
if (!el) throw new Error('Elemento #root não encontrado')

createRoot(el).render(
  <React.StrictMode>
    <BrowserRouter>
      <RootApp />
    </BrowserRouter>
  </React.StrictMode>
)
