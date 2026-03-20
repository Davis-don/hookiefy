import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../utils/logout'; // Import the logout utility
import Header from './common/Clientheader';
import HomeContent from './Homecontent';
import NotificationsContent from './NotificationsContent';
import ProfileContent from './ProfileContent';
import BillingContent from './BillingContent';
import Uploadclientimg from './Uploadclientimg';
import Clientbioupload from './Clientbioupload';
import './clientaccount.css';

function Clientaccount() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('home');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // On mobile, sidebar should be closed by default
      // On desktop, sidebar should be open by default
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Set initial state based on screen size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    const success = await logoutUser(apiUrl);
    
    if (success) {
      // Navigation is handled in the logout function with window.location.href
      // But we can also use navigate if preferred
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } else {
      setIsLoggingOut(false);
    }
  };

  const menuItems = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'notifications', icon: '🔔', label: 'Notifications', count: 5 },
    { id: 'profile', icon: '👤', label: 'Profile' },
    { id: 'billing', icon: '💰', label: 'Billing & Transfers' },
    { id: 'profilephoto', icon: '📸', label: 'Profile Photo' },
    { id: 'profilebio', icon: '✏️', label: 'Profile Bio' }
  ];

  const renderContent = () => {
    switch(activePage) {
      case 'home':
        return <HomeContent />;
      case 'notifications':
        return <NotificationsContent />;
      case 'profile':
        return <ProfileContent />;
      case 'billing':
        return <BillingContent />;
      case 'profilephoto':
        return <Uploadclientimg />;
      case 'profilebio':
        return <Clientbioupload />;
      default:
        return <HomeContent />;
    }
  };

  return (
    <div className="ca-app">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="ca-layout">
        <aside className={`ca-sidebar ${sidebarOpen ? 'ca-sidebar-open' : 'ca-sidebar-closed'}`}>
          <nav className="ca-sidebar-nav">
            {menuItems.map((item) => (
              <div 
                key={item.id} 
                className={`ca-nav-item ${activePage === item.id ? 'ca-nav-active' : ''}`}
                onClick={() => {
                  setActivePage(item.id);
                  // On mobile, close sidebar after selecting a menu item
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
              >
                <span className="ca-nav-icon">{item.icon}</span>
                <span className="ca-nav-label">{item.label}</span>
                {item.count && (
                  <span className="ca-nav-count">{item.count}</span>
                )}
              </div>
            ))}
            
            {/* Logout button as separate item */}
            <div 
              className={`ca-nav-item ca-nav-logout ${isLoggingOut ? 'ca-nav-logging-out' : ''}`}
              onClick={handleLogout}
            >
              <span className="ca-nav-icon">{isLoggingOut ? '⏳' : '🚪'}</span>
              <span className="ca-nav-label">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </div>
          </nav>

          <div className="ca-sidebar-footer">
            <div className="ca-premium-card">
              <h4 className="ca-premium-title">Go Premium</h4>
              <p className="ca-premium-text">Get unlimited access to all features</p>
              <button className="ca-premium-btn">Upgrade Now</button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile when sidebar is open */}
        {isMobile && sidebarOpen && (
          <div className="ca-sidebar-overlay" onClick={toggleSidebar}></div>
        )}

        <main className="ca-main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default Clientaccount;