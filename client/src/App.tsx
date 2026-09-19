import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from 'sonner';
import Superadmin from "./Accounts/superadmin/pages/Superadmin";
import Unauthorized from "./pages/Unauthorized";
import Toastlayout from "./layouts/Toastlayout";
import Homepage from "./pages/Homepage";
import Protectedroute from "./components/protected/Protectedroute";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import PaymentError from "./pages/PaymentError";
import Mainlayout from "./layouts/Mainlayout";
import Serviceseeker from "./pages/Seviceseeker";
import Serviceprovider from "./pages/Serviceprovider";
import Serviceproviderdash from "./Accounts/service_provider/pages/Serviceproviderdash";
import Serviceseekerdash from "./Accounts/service_seeker/pages/Serviceseekerdash";
import Header from "./components/Header/Header";
import Login from "./pages/Login";
import Accountslayout from "./layouts/Accountslayout";

/* ✅ Public viewers */
import ServicesInfo from "./pages/ServicesInfo";
import StoryInfo from "./pages/StoryInfo";

import "./App.css";

function App() {
  return (
    <div className="app">
      <Router>
        <Routes>
          {/* ✅ Public — Homepage handles its own auth-based redirect */}
          <Route path="/" element={<Mainlayout><Homepage /></Mainlayout>} />
          <Route path="/serviceseeker" element={<><Header /> <Serviceseeker /></>} />
          <Route path="/serviceprovider" element={<><Header /> <Serviceprovider /></>} />
          <Route path="/login" element={<><Header /> <Login /></>} />

          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Payment routes — public */}
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-failure" element={<PaymentFailure />} />
          <Route path="/payment-error" element={<PaymentError />} />

          {/* ============================================================
              ✅ Public standalone viewers
              - Full-bleed, no external Header/Mainlayout
              - Each renders its own PublicHeader internally
              - Reachable from Share.tsx links: /s/<id> and /p/<id>
              ============================================================ */}

          {/* Story viewer — /s/42  or  /stories/42 */}
          <Route path="/s/:id" element={<StoryInfo />} />
          <Route path="/stories/:id" element={<StoryInfo />} />

          {/* Service / Product / Hookup viewer — /p/7  or  /services/7 */}
          <Route path="/p/:id" element={<ServicesInfo />} />
          <Route path="/services/:id" element={<ServicesInfo />} />

          {/* ============================================================
              ✅ Protected — role-gated
              ============================================================ */}

          {/* Superadmin only */}
          <Route
            path="/superadmin/dashboard"
            element={
              <Protectedroute allowedRoles={["superadmin"]}>
                <Toastlayout>
                  <Superadmin />
                </Toastlayout>
              </Protectedroute>
            }
          />

          {/* Service Seeker only */}
          <Route
            path="/service_seeker/dashboard"
            element={
              <Protectedroute allowedRoles={["serviceseeker"]}>
                <Accountslayout>
                  <Toastlayout>
                    <Serviceseekerdash />
                  </Toastlayout>
                </Accountslayout>
              </Protectedroute>
            }
          />

          {/* Service Provider only */}
          <Route
            path="/service_provider/dashboard"
            element={
              <Protectedroute allowedRoles={["serviceprovider"]}>
                <Accountslayout>
                  <Toastlayout>
                    <Serviceproviderdash />
                  </Toastlayout>
                </Accountslayout>
              </Protectedroute>
            }
          />

          <Route path="*" element={<Unauthorized />} />
        </Routes>

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