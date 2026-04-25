import './header.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useState, useEffect } from 'react';

function Header() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleNavigation = (path: string) => {
    window.location.href = path;
    closeSidebar();
  };

  return (
    <>
      <div className="overall-header-container">
        <div className="left-side-header-container">
          <h1 className="header-logo" onClick={() => handleNavigation('/')}>Hookify</h1>
        </div>
        
        <div className="center-side-header-container">
          <ul className='list-unstyled'>
            <li className="header-nav-item" onClick={() => handleNavigation('/')}>Home</li>
            <li className="header-nav-item" onClick={() => handleNavigation('/about')}>About</li>
            <li className="header-nav-item" onClick={() => handleNavigation('/contact')}>Contact</li>
          </ul>
        </div>
        
        <div className="right-side-header-container">
          {/* Sign in button - hides on mobile, only shows in sidebar */}
          {!isMobile && (
            <button className="header-login-btn btn btn-outline-primary" onClick={() => handleNavigation('/signin')}>Sign in</button>
          )}
          {isMobile && (
            <button className="hamburger-btn" onClick={toggleSidebar}>
              <span className="hamburger-icon">☰</span>
            </button>
          )}
        </div>
      </div>

      {/* Beautiful Mobile Sidebar - smooth slide from right */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={closeSidebar}>
        <div className={`mobile-sidebar ${isSidebarOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="sidebar-header">
            <div className="sidebar-logo-wrapper">
              <h2 className="sidebar-logo">Hookify</h2>
              <div className="sidebar-logo-underline"></div>
            </div>
            <button className="close-sidebar" onClick={closeSidebar}>
              <span>✕</span>
            </button>
          </div>
          
          <div className="sidebar-content">
            <ul className="sidebar-nav-list">
              <li onClick={() => handleNavigation('/')}>
                <span className="nav-icon">🏠</span>
                <span className="nav-text">Home</span>
                <span className="nav-arrow">→</span>
              </li>
              <li onClick={() => handleNavigation('/about')}>
                <span className="nav-icon">ℹ️</span>
                <span className="nav-text">About</span>
                <span className="nav-arrow">→</span>
              </li>
              <li onClick={() => handleNavigation('/contact')}>
                <span className="nav-icon">📧</span>
                <span className="nav-text">Contact</span>
                <span className="nav-arrow">→</span>
              </li>
            </ul>
          </div>
          
          <div className="sidebar-footer">
            <button className="sidebar-login-btn" onClick={() => handleNavigation('/signin')}>
              <span>🔐</span> Sign in
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Header;