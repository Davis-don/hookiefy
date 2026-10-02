import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import Home from "./pages/Home";
import Mainlayout from "./layouts/Mainlayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If there's a hash (e.g. /#services), let the Home page handle scrolling.
    if (hash) return;
    // Otherwise, jump to the top on every route change.
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Mainlayout><Home /></Mainlayout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/terms" element={<Mainlayout><Terms /></Mainlayout>} />
        <Route path="/privacy" element={<Mainlayout><Privacy /></Mainlayout>} />
      </Routes>
    </Router>
  );
}

export default App;