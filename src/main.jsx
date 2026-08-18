import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { EntitlementProvider } from './entitlement/EntitlementProvider.jsx'
import { ThemeProvider } from './theme/ThemeProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <EntitlementProvider>
        <App />
      </EntitlementProvider>
    </ThemeProvider>
  </StrictMode>,
)
