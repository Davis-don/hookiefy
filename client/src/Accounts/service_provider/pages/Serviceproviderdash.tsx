// Serviceproviderdash.tsx
import { useState, useEffect } from 'react';
import './serviceproviderdash.css';
import Header from '../components/Header';
import Home from '../components/Home';
import MyServices from '../components/MyServices';
import Profile from '../components/Profile';
import Stories from '../components/stories/Stories';
import AddData from '../components/AddData';
import MyConnections from '../components/connections/MyConnections';

/* Tabs that render edge-to-edge (no content-wrapper padding) */
const FULL_BLEED_TABS = new Set(['home', 'add-data', 'connections']);

const Serviceproviderdash = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAddData, setShowAddData] = useState(false);

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
    { id: 'stories', label: 'Stories', icon: '📸', component: Stories },
    {
      id: 'connections',
      label: 'Connections',
      icon: '🔗',
      component: MyConnections,
    },
    {
      id: 'my-services',
      label: 'My Services',
      icon: '🛠️',
      component: MyServices,
    },
  ];

  const renderActiveComponent = () => {
    if (showAddData) return <AddData onClose={() => setShowAddData(false)} />;
    if (showProfile) return <Profile />;
    const activeItem = menuItems.find((item) => item.id === activeTab);
    const ActiveComponent = activeItem?.component || Home;
    return <ActiveComponent />;
  };

  const handleHeaderProfileClick = () => {
    setShowProfile(true);
    setShowAddData(false);
    setActiveTab('');
  };

  const handleNavClick = (id: string) => {
    setShowProfile(false);
    setShowAddData(false);
    setActiveTab(id);
  };

  const handleBrandClick = () => {
    setShowProfile(false);
    setShowAddData(false);
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddClick = () => {
    setShowProfile(false);
    setShowAddData(true);
    setActiveTab('add-data');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  /* Mobile nav — Home, Stories | [+] | Connections, My Services */
  const mobileNavItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'stories', label: 'Stories', icon: '📸' },
    { id: 'connections', label: 'Connections', icon: '🔗' },
    { id: 'my-services', label: 'My Services', icon: '🛠️' },
  ];

  /* Split items into left / right of the "+" */
  const leftItems = mobileNavItems.slice(0, 2);
  const rightItems = mobileNavItems.slice(2);

  /* Should the current view render edge-to-edge? */
  const useFullBleed = !showProfile && FULL_BLEED_TABS.has(activeTab);

  return (
    <div className="yp-dash-container">
      {/* Mobile Top Header */}
      {isMobile && (
        <Header
          onProfileClick={handleHeaderProfileClick}
          onBrandClick={handleBrandClick}
        />
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className={`yp-dash-sidebar ${
            sidebarOpen ? 'yp-dash-sidebar-open' : ''
          }`}
        >
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
                className={`yp-dash-sidebar-item ${
                  activeTab === item.id && !showProfile && !showAddData
                    ? 'yp-dash-sidebar-item-active'
                    : ''
                }`}
                onClick={() => handleNavClick(item.id)}
                type="button"
              >
                <span className="yp-dash-sidebar-icon">{item.icon}</span>
                <span className="yp-dash-sidebar-label">{item.label}</span>
              </button>
            ))}

            {/* Add data button on desktop sidebar */}
            <button
              className={`yp-dash-sidebar-item ${
                showAddData ? 'yp-dash-sidebar-item-active' : ''
              }`}
              onClick={handleAddClick}
              type="button"
            >
              <span className="yp-dash-sidebar-icon">➕</span>
              <span className="yp-dash-sidebar-label">Add Data</span>
            </button>
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

      {/* Main Content — conditionally padded */}
      <main
        className={`yp-dash-main ${
          !isMobile && sidebarOpen ? 'yp-dash-main-shifted' : ''
        }`}
      >
        {useFullBleed ? (
          <div className="yp-dash-full-bleed">
            {renderActiveComponent()}
          </div>
        ) : (
          <div className="yp-dash-content-wrapper">
            {renderActiveComponent()}
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav — Home, Stories | [+] | Connections, My Services */}
      {isMobile && (
        <nav className="yp-dash-bottom-nav">
          {leftItems.map((item) => (
            <button
              key={item.id}
              className={`yp-dash-nav-item ${
                activeTab === item.id && !showProfile && !showAddData
                  ? 'yp-dash-nav-item-active'
                  : ''
              }`}
              onClick={() => handleNavClick(item.id)}
              aria-label={item.label}
              type="button"
            >
              <span className="yp-dash-nav-icon">{item.icon}</span>
            </button>
          ))}

          {/* Centered + button */}
          <button
            className="yp-dash-nav-add"
            onClick={handleAddClick}
            aria-label="Add"
            type="button"
          >
            <span className="yp-dash-nav-add-icon">+</span>
          </button>

          {rightItems.map((item) => (
            <button
              key={item.id}
              className={`yp-dash-nav-item ${
                activeTab === item.id && !showProfile && !showAddData
                  ? 'yp-dash-nav-item-active'
                  : ''
              }`}
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