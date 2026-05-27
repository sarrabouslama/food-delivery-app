import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client/react'
import { Toaster } from 'react-hot-toast'
import { apolloClient } from './lib/apollo'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <CartProvider>
            <App />
            <Toaster position="top-right" toastOptions={{ className: 'glass-panel', style: { background: 'var(--color-surface-glass)', color: 'var(--color-text)' } }} />
          </CartProvider>
        </AuthProvider>
      </ApolloProvider>
    </BrowserRouter>
  </StrictMode>,
)
