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
import "./App.css";

function App() {
  return (
    <div className="app">
      <Router>
        <Routes>
          <Route path="/" element={<Homepage />} />
          {/* <Route path="/" element={<Clientaccount />} /> */}
          {/* Public routes */}
          <Route path="/login" element={
            <Toastlayout>
            <Login />
            </Toastlayout>} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/spinner" element={<CenteredSpinner />} />
          

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