import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { watchForServiceWorkerUpdate } from './lib/pwa-updates.ts'
import { Capacitor } from '@capacitor/core'
import { offerWebUpdate } from './lib/app-updates.ts'

if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  watchForServiceWorkerUpdate(navigator.serviceWorker, offerWebUpdate)
  void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => undefined)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
