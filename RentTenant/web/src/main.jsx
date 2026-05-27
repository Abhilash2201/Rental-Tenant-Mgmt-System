/**
 * @file main.jsx
 * @description React app entry point.
 * Sets up:
 *   - React Query (server state management)
 *   - React Router (client-side routing)
 *   - Auth context (JWT + owner state)
 *   - Toast notifications (react-hot-toast)
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import App from './App.jsx';
import './index.css';

/**
 * React Query client configuration.
 * - staleTime: 5 min — data won't refetch within 5 minutes of last fetch
 * - retry: 1 — retry failed requests once before showing error
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch when switching tabs
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* React Query: manages server state and caching */}
    <QueryClientProvider client={queryClient}>
      {/* BrowserRouter: enables client-side routing */}
      <BrowserRouter>
        {/* AuthProvider: JWT auth state available everywhere */}
        <AuthProvider>
          <App />

          {/* Global toast notifications (shows success/error popups) */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#f1f5f9',
                borderRadius: '8px',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
