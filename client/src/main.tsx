// src/main.tsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';

import './index.css';
import App from './App.tsx';

// Create a client with custom configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s is enough to avoid hammering the server while keeping
      // engagement counts (likes/follows) fresh. Per-query overrides
      // (in useEngagement.ts) still apply on top of this.
      staleTime: 30 * 1000,       // 30 seconds

      // Keep unmounted query data around long enough that
      // navigating between pages doesn't refetch everything.
      gcTime: 10 * 60 * 1000,     // 10 minutes

      retry: 1,

      // Refresh when the user comes back to the tab — counts stay
      // correct when they've been away for a while.
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider
        clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
      >
        <App />
      </GoogleOAuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);