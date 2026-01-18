import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { syncService } from './services/syncService'

// Expose sync utilities in development for debugging
if (import.meta.env.DEV) {
  (window as any).syncUtils = {
    pullAllFromServer: () => syncService.pullAllFromServer(),
    markAllAsUnsynced: () => syncService.markAllAsUnsynced(),
    resetSyncState: () => syncService.resetSyncState(),
    sync: () => syncService.sync(),
  };
  console.log('Sync utilities available at window.syncUtils');
  console.log('Available methods:', Object.keys((window as any).syncUtils));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
