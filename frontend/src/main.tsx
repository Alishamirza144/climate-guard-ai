import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider } from './lib/theme'
import { ToastProvider } from './components/ui/Toast'
import './lib/i18n'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
})

// Service worker registration is managed automatically by Progressier via script.js and /progressier.js.
// Manual registration of /sw.js is omitted to prevent duplicate service worker registrations and scope conflicts.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ToastProvider>
              <App />
              {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
