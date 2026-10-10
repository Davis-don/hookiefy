// src/App.tsx

import { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';

import Home from './pages/Home';
import Superaccount from './features/accounts/superadmin/pages/Superaccount';
import Useraccount from './features/accounts/User/pages/Useraccount';
import Mainlayout from './layouts/Mainlayout';
import Login from './pages/login/Login';
import Register from './pages/register/Register';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import PaymentCallback from './pages/PaymentCallback';

import { ToastProvider } from './components/toast/ToastContext';
import RequireAuth from './components/auth/RequireAuth';
import RedirectIfAuthed from './components/auth/RedirectIfAuthed';

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <ToastProvider>
        <Routes>
          {/* ─────────────────────────────────────────────
              Public-only routes — logged-in users get
              bounced to their dashboard.
              ───────────────────────────────────────────── */}

          <Route
            path="/"
            element={
              <RedirectIfAuthed>
                <Mainlayout>
                  <Home />
                </Mainlayout>
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <Login />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectIfAuthed>
                <Register />
              </RedirectIfAuthed>
            }
          />

          {/* ─────────────────────────────────────────────
              Public for everyone, logged in or not.
              ───────────────────────────────────────────── */}

          <Route
            path="/terms"
            element={
              <Mainlayout>
                <Terms />
              </Mainlayout>
            }
          />
          <Route
            path="/privacy"
            element={
              <Mainlayout>
                <Privacy />
              </Mainlayout>
            }
          />

          {/* ─────────────────────────────────────────────
              Protected routes.
              ───────────────────────────────────────────── */}

          <Route
            path="/superaccount"
            element={
              <RequireAuth role="superadmin">
                <Superaccount />
              </RequireAuth>
            }
          />

          <Route
            path="/useraccount"
            element={
              <RequireAuth>
                <Useraccount />
              </RequireAuth>
            }
          />

          {/* PesaPal redirects the browser here after payment. */}
          <Route
            path="/payment/callback"
            element={
              <RequireAuth>
                <PaymentCallback />
              </RequireAuth>
            }
          />
        </Routes>
      </ToastProvider>
    </Router>
  );
}

export default App;