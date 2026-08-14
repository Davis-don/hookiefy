import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from 'sonner'
import Superadmin from "./pages/superadmin/Superadmin";
import Admin from "./pages/admin/Admin";
import User from "./pages/users/User";
import Unauthorized from "./pages/common/Unauthorized";
import CenteredSpinner from "./pages/Spinnerpage";
import Toastlayout from "./layouts/Toastlayout";
import Homepage from "./pages/common/Homepage";
import Protectedroute from "./components/protected/Protectedroute";
// ============================================================
// IMPORT PAYMENT PAGES
// ============================================================
import PaymentSuccess from "./pages/payments/PaymentSuccess";
import PaymentFailure from "./pages/payments/PaymentFailure";
import PaymentError from "./pages/payments/PaymentError";
import "./App.css";

function App() {
  return (
    <div className="app">
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={
            <Homepage />} />
              
          <Route path="/signin" element={
            <Toastlayout>
              <Homepage/>
            </Toastlayout>
          } />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/spinner" element={<CenteredSpinner />} />
          
          // ============================================================
          // PAYMENT ROUTES - Public (no authentication required)
          // ============================================================
          <Route path="/payment-success" element={
              <PaymentSuccess />
          } />
          <Route path="/payment-failure" element={
              <PaymentFailure />
          } />
          <Route path="/payment-error" element={
              <PaymentError />
          } />

          {/* Protected routes - Superadmin only */}
          <Route
            path="/superadmin/dashboard"
            element={
              <Protectedroute>
                <Toastlayout>
                  <Superadmin />
                </Toastlayout>
              </Protectedroute>
            }
          />
          
          {/* Protected routes - Admin only */}
          <Route
            path="/admin/dashboard"
            element={
              <Protectedroute>
                <Toastlayout>
                  <Admin />
                </Toastlayout>
              </Protectedroute>
            }
          />
          
          {/* Protected routes - User only */}
          <Route
            path="/user/dashboard"
            element={
              <Protectedroute>
                <Toastlayout>
                  <User />
                </Toastlayout>
              </Protectedroute>
            }
          />
          
          {/* Catch all route - 404 */}
          <Route path="*" element={<Unauthorized />} />
        </Routes>
        
        {/* Sonner Toaster - Placed outside Routes so it's available everywhere */}
        <Toaster 
          position="top-right"
          richColors
          closeButton
          duration={5000}
          expand={false}
          visibleToasts={3}
          toastOptions={{
            style: {
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '1rem',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            },
            className: 'sonner-toast',
          }}
          icons={{
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️',
            loading: '⏳',
          }}
        />
      </Router>
    </div>
  );
}

export default App;