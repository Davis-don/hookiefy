import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/common/Login'
import Superadmin from './pages/superadmin/Superadmin';
import Admin from './pages/admin/Admin';
import './App.css'

function App() {

  return (
    <div className="app">
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/superadmin" element={<Superadmin />} />
          <Route path="/" element={<Admin />} />
        </Routes>
      </Router>
    </div>  )
}

export default App
