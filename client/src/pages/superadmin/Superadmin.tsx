import React, { useState, useEffect } from 'react';
import './superadmin.css';

// Import components
import Dashboard from '../../components/superadmin/Dashboard';
import Settings from '../../components/superadmin/Settings';
import Admins from '../../components/superadmin/Admins';
import Balance from '../../components/superadmin/Balance';

// Types
type ActiveTab = 'dashboard' | 'settings' | 'admins';

interface MenuItem {
  id: ActiveTab;
  label: string;
  icon: string;
}

const GlitterRain: React.FC = () => {
  return (
    <div className="hookey-superadmin-glitter-rain">
      {[...Array(30)].map((_, i) => (
        <i key={i}></i>
      ))}
    </div>
  );
};

const FloatingRoses: React.FC = () => {
  return (
    <div className="hookey-superadmin-floating-roses">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="hookey-superadmin-rose">
          <span>🌹</span>
        </div>
      ))}
    </div>
  );
};

const Superadmin: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMenuOpen(true);
      } else {
        setIsMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '✨' },
    { id: 'settings', label: 'Settings', icon: '⚡' },
    { id: 'admins', label: 'Admins', icon: '👑' },
  ];

  const handleLogout = (): void => {
    console.log('Logging out...');
  };

  const toggleMenu = (): void => {
    setIsMenuOpen(!isMenuOpen);
  };

  const renderActiveComponent = (): React.ReactNode => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'settings':
        return <Settings />;
      case 'admins':
        return <Admins />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="hookey-superadmin-romantic-container">
      <GlitterRain />
      <FloatingRoses />
      
      {/* Top Bar with Balance */}
      <div className="hookey-superadmin-top-bar">
        <div className="hookey-superadmin-top-bar-left">
          {isMobile && (
            <button 
              className={`hookey-superadmin-hamburger ${isMenuOpen ? 'hookey-superadmin-hamburger-open' : ''}`}
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          )}
          <h1 className="hookey-superadmin-page-title">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h1>
        </div>
        <Balance />
      </div>

      {/* Sidebar Menu */}
      <aside 
        className={`hookey-superadmin-sidebar ${isMenuOpen ? 'hookey-superadmin-sidebar-open' : ''}`}
      >
        <div className="hookey-superadmin-sidebar-header">
          <h2 className="hookey-superadmin-logo">
            Hookey<span>Romance</span>
          </h2>
          <div className="hookey-superadmin-love-meter">
            <span>❤️</span>
            <span>❤️</span>
            <span>❤️</span>
            <span>❤️</span>
            <span>❤️</span>
          </div>
        </div>

        <nav className="hookey-superadmin-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`hookey-superadmin-nav-item ${activeTab === item.id ? 'hookey-superadmin-nav-item-active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                if (isMobile) setIsMenuOpen(false);
              }}
            >
              <span className="hookey-superadmin-nav-icon">{item.icon}</span>
              <span className="hookey-superadmin-nav-label">{item.label}</span>
              {activeTab === item.id && <span className="hookey-superadmin-nav-glow"></span>}
            </button>
          ))}
        </nav>

        <div className="hookey-superadmin-sidebar-footer">
          <button className="hookey-superadmin-nav-item hookey-superadmin-logout-btn" onClick={handleLogout}>
            <span className="hookey-superadmin-nav-icon">💕</span>
            <span className="hookey-superadmin-nav-label">Logout</span>
          </button>
        </div>

        <div className="hookey-superadmin-sidebar-quote">
          <p>"Love is the poetry of the senses"</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="hookey-superadmin-main-content">
        <div className="hookey-superadmin-component-wrapper">
          {renderActiveComponent()}
        </div>
      </main>

      {/* Overlay for mobile menu */}
      {isMobile && isMenuOpen && (
        <div 
          className="hookey-superadmin-overlay"
          onClick={() => setIsMenuOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Superadmin;