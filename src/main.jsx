import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { EntitlementProvider } from './entitlement/EntitlementProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EntitlementProvider>
      <App />
    </EntitlementProvider>
  </StrictMode>,
)
