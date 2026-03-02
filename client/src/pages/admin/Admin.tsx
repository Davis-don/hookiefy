import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './admin.css';

// Import components
import AdminDashboard from '../../components/admin/AdminDashboard';
import AdminSettings from '../../components/admin/AdminSettings';
import AdminClients from './AdminClients';
import AdminBalance from './AdminBalance';
import { logoutUser } from '../../utils/logout';

// Types
type ActiveTab = 'dashboard' | 'settings' | 'clients';

interface MenuItem {
  id: ActiveTab;
  label: string;
  icon: string;
}

const AdminGlitterSparkles: React.FC = () => {
  return (
    <div className="hookey-admin-glitter-sparkles">
      {[...Array(25)].map((_, i) => (
        <i key={i}></i>
      ))}
    </div>
  );
};

const AdminFloatingHearts: React.FC = () => {
  return (
    <div className="hookey-admin-floating-hearts">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="hookey-admin-heart">
          <span>💖</span>
        </div>
      ))}
    </div>
  );
};

const Admin: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<ActiveTab>('dashboard');
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuLinks: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '🌟' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'clients', label: 'Clients', icon: '💑' },
  ];

  const handleSignOut = async (): Promise<void> => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    const success = await logoutUser(apiUrl);
    
    if (success) {
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } else {
      setIsLoggingOut(false);
    }
  };

  const toggleSidebar = (): void => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderActiveView = (): React.ReactNode => {
    switch (activeView) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'settings':
        return <AdminSettings />;
      case 'clients':
        return <AdminClients />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="hookey-admin-romantic-wrapper">
      <AdminGlitterSparkles />
      <AdminFloatingHearts />
      
      {/* Top Navigation Bar with Balance */}
      <div className="hookey-admin-top-nav">
        <div className="hookey-admin-top-nav-left">
          {isMobileView && (
            <button 
              className={`hookey-admin-menu-btn ${isSidebarOpen ? 'hookey-admin-menu-btn-open' : ''}`}
              onClick={toggleSidebar}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          )}
          <h1 className="hookey-admin-page-heading">
            {activeView.charAt(0).toUpperCase() + activeView.slice(1)}
          </h1>
        </div>
        <AdminBalance />
      </div>

      {/* Sidebar Navigation */}
      <aside 
        className={`hookey-admin-side-panel ${isSidebarOpen ? 'hookey-admin-side-panel-open' : ''}`}
      >
        <div className="hookey-admin-side-panel-header">
          <h2 className="hookey-admin-brand">
            Hookey<span>Love</span>
          </h2>
          <div className="hookey-admin-romance-meter">
            <span>💕</span>
            <span>💕</span>
            <span>💕</span>
            <span>💕</span>
            <span>💕</span>
          </div>
        </div>

        <nav className="hookey-admin-nav-menu">
          {menuLinks.map((item) => (
            <button
              key={item.id}
              className={`hookey-admin-nav-link ${activeView === item.id ? 'hookey-admin-nav-link-active' : ''}`}
              onClick={() => {
                setActiveView(item.id);
                if (isMobileView) setIsSidebarOpen(false);
              }}
              disabled={isLoggingOut}
            >
              <span className="hookey-admin-nav-icon">{item.icon}</span>
              <span className="hookey-admin-nav-text">{item.label}</span>
              {activeView === item.id && <span className="hookey-admin-nav-glow-dot"></span>}
            </button>
          ))}
        </nav>

        <div className="hookey-admin-side-panel-footer">
          <button 
            className={`hookey-admin-nav-link hookey-admin-logout-btn ${isLoggingOut ? 'hookey-admin-logging-out' : ''}`}
            onClick={handleSignOut}
            disabled={isLoggingOut}
          >
            <span className="hookey-admin-nav-icon">{isLoggingOut ? '⏳' : '💔'}</span>
            <span className="hookey-admin-nav-text">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>

        <div className="hookey-admin-love-note">
          <p>"Every love story is beautiful"</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="hookey-admin-main-area">
        <div className="hookey-admin-content-card">
          {renderActiveView()}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileView && isSidebarOpen && (
        <div 
          className="hookey-admin-mobile-overlay"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Admin;