import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { watchForServiceWorkerUpdate } from './lib/pwa-updates.ts'

if ('serviceWorker' in navigator) watchForServiceWorkerUpdate(navigator.serviceWorker)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
