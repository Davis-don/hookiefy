import { useState, useEffect } from 'react';
import './serviceproviderdash.css';
import Header from '../components/Header';
import Home from '../components/Home';
import MyServices from '../components/MyServices';
import Profile from '../components/Profile';
import Settings from '../components/Settings';
import Messages from '../components/Messages';

const Serviceproviderdash = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠', component: Home },
    { id: 'messages', label: 'Messages', icon: '💬', component: Messages },
    { id: 'my-services', label: 'My Services', icon: '🛠️', component: MyServices },
    { id: 'settings', label: 'Settings', icon: '⚙️', component: Settings },
  ];

  const renderActiveComponent = () => {
    if (showProfile) return <Profile />;
    const activeItem = menuItems.find((item) => item.id === activeTab);
    const ActiveComponent = activeItem?.component || Home;
    return <ActiveComponent />;
  };

  const handleHeaderProfileClick = () => {
    setShowProfile(true);
    setActiveTab('');
  };

  const handleNavClick = (id: string) => {
    setShowProfile(false);
    setActiveTab(id);
  };

  const handleBrandClick = () => {
    setShowProfile(false);
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const mobileNavItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'messages', label: 'Messages', icon: '💬' },
    { id: 'my-services', label: 'Services', icon: '🛠️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="yp-dash-container">
      {/* Mobile Top Header — brand = Home, avatar = Profile */}
      {isMobile && (
        <Header
          onProfileClick={handleHeaderProfileClick}
          onBrandClick={handleBrandClick}
        />
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className={`yp-dash-sidebar ${sidebarOpen ? 'yp-dash-sidebar-open' : ''}`}>
          <div className="yp-dash-sidebar-header">
            <h2
              className="yp-dash-sidebar-logo"
              onClick={handleBrandClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleBrandClick();
                }
              }}
              role="link"
              tabIndex={0}
              aria-label="Go to home"
            >
              <span className="yp-logo-you">You</span>
              <span className="yp-logo-p">p</span>
              <span className="yp-logo-ata">ata</span>
            </h2>

            <button
              className="yp-dash-sidebar-toggle"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
              type="button"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>

          <nav className="yp-dash-sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`yp-dash-sidebar-item ${activeTab === item.id && !showProfile ? 'yp-dash-sidebar-item-active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                type="button"
              >
                <span className="yp-dash-sidebar-icon">{item.icon}</span>
                <span className="yp-dash-sidebar-label">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="yp-dash-sidebar-footer">
            <button
              className="yp-dash-user-info"
              onClick={handleHeaderProfileClick}
              aria-label="Open profile"
              type="button"
            >
              <div className="yp-dash-user-avatar">SP</div>
              <div className="yp-dash-user-details">
                <span className="yp-dash-user-name">Service Provider</span>
                <span className="yp-dash-user-status">Online</span>
              </div>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`yp-dash-main ${!isMobile && sidebarOpen ? 'yp-dash-main-shifted' : ''}`}>
        <div className="yp-dash-content-wrapper">{renderActiveComponent()}</div>
      </main>

      {/* Mobile Bottom Nav — ICON ONLY */}
      {isMobile && (
        <nav className="yp-dash-bottom-nav">
          {mobileNavItems.map((item) => (
            <button
              key={item.id}
              className={`yp-dash-nav-item ${activeTab === item.id && !showProfile ? 'yp-dash-nav-item-active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              aria-label={item.label}
              type="button"
            >
              <span className="yp-dash-nav-icon">{item.icon}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default Serviceproviderdash;