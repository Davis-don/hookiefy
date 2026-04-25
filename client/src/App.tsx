import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/common/Login";
import Superadmin from "./pages/superadmin/Superadmin";
import Admin from "./pages/admin/Admin";
import Unauthorized from "./pages/common/Unauthorized";
import Clientaccount from "./pages/client/Clientaccount";
import ProtectedRoute from "./components/protected/Protectedroute";
import CenteredSpinner from "./pages/Spinnerpage";
import Toastlayout from "./layouts/Toastlayout";
import Homepage from "./pages/common/Homepage";
import PaymentSuccess from "./pages/client/common/Paymentsuccess";
import PaymentFailed from "./pages/client/common/Paymentfailed";
import Mainlayout from "./layouts/Mainlayout";
import "./App.css";

function App() {
  return (
    <div className="app">
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={
            <Mainlayout><Homepage /></Mainlayout>} />
          <Route path="/login" element={
            <Toastlayout>
              <Login />
            </Toastlayout>
          } />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/spinner" element={<CenteredSpinner />} />
          
          {/* Payment redirect routes (public, no auth needed) */}
          <Route path="/payment-success" element={
            <Toastlayout>
              <PaymentSuccess />
            </Toastlayout>
          } />
          <Route path="/payment-failed" element={
            <Toastlayout>
              <PaymentFailed />
            </Toastlayout>
          } />

          {/* Protected routes */}
          <Route
            path="/superadmin/dashboard"
            element={
              <ProtectedRoute>
                <Toastlayout>
                  <Superadmin />
                </Toastlayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <Toastlayout>
                  <Admin />
                </Toastlayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/dashboard"
            element={
              <ProtectedRoute>
                <Toastlayout>
                  <Clientaccount />
                </Toastlayout>
              </ProtectedRoute>
            }
          />
          
          {/* Catch all route - 404 */}
          <Route path="*" element={<Unauthorized />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;