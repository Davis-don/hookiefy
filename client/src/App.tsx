import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/common/Login'
import Superadmin from './pages/superadmin/Superadmin';
import './App.css'

function App() {

  return (
    <div className="app">
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Superadmin />} />
        </Routes>
      </Router>
    </div>  )
}

export default App
