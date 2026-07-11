import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { APP_BASE_PATH } from './config/api'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { SubscriptionProvider } from './context/SubscriptionContext'
import { BranchProvider } from './context/BranchContext'
import { CompanyProvider } from './context/CompanyContext'
import { SidebarProvider } from './context/SidebarContext'
import { ToastProvider } from './context/ToastContext'
import { AlertsProvider } from './context/AlertsContext'
import { PrintProvider } from './context/PrintContext'
import './index.css'
import './components/print/print.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={APP_BASE_PATH || undefined}>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>
          <CompanyProvider>
          <BranchProvider>
          <SidebarProvider>
            <ToastProvider>
              <AlertsProvider>
                <PrintProvider>
                  <App />
                </PrintProvider>
              </AlertsProvider>
            </ToastProvider>
          </SidebarProvider>
          </BranchProvider>
          </CompanyProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
