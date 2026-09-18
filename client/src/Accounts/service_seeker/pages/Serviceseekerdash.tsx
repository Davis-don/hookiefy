// Serviceseekerdash.tsx

import { useState, useEffect } from 'react';
import './serviceseekerdash.css';
import SeekerHeader from '../components/SeekerHeader';
import SeekerHome from '../components/SeekerHome';
import SeekerBookings from '../components/SeekerBookings';
import SeekerProfile from '../components/SeekerProfile';
import SeekerSettings from '../components/SeekerSettings';
import SeekerMessages from '../components/SeekerMessages';

/* Tabs that should stretch edge-to-edge (no padding) */
const FULL_BLEED_TABS = new Set(['home']);

const Serviceseekerdash = () => {
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

    return () =>
      window.removeEventListener('resize', checkScreenSize);
  }, []);

  const menuItems = [
    {
      id: 'home',
      label: 'Home',
      icon: '🏠',
      component: SeekerHome,
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: '💬',
      component: SeekerMessages,
    },
    {
      id: 'my-bookings',
      label: 'My Bookings',
      icon: '📋',
      component: SeekerBookings,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      component: SeekerSettings,
    },
  ];

  const renderActiveComponent = () => {
    if (showProfile) return <SeekerProfile />;

    const activeItem = menuItems.find(
      (item) => item.id === activeTab
    );

    const ActiveComponent =
      activeItem?.component || SeekerHome;

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
    {
      id: 'my-bookings',
      label: 'Bookings',
      icon: '📋',
    },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  /* Should the current view render edge-to-edge? */
  const useFullBleed =
    !showProfile && FULL_BLEED_TABS.has(activeTab);

  return (
    <div className="ss-dash-container">
      {/* Mobile top header */}
      {isMobile && (
        <SeekerHeader
          onProfileClick={handleHeaderProfileClick}
          onBrandClick={handleBrandClick}
        />
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <aside
          className={`ss-dash-sidebar ${
            sidebarOpen ? 'ss-dash-sidebar-open' : ''
          }`}
        >
          <div className="ss-dash-sidebar-header">
            <h2
              className="ss-dash-sidebar-logo"
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
              <span className="ss-logo-you">You</span>
              <span className="ss-logo-p">p</span>
              <span className="ss-logo-ata">ata</span>
            </h2>

            <button
              className="ss-dash-sidebar-toggle"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
              type="button"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>

          <nav className="ss-dash-sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`ss-dash-sidebar-item ${
                  activeTab === item.id && !showProfile
                    ? 'ss-dash-sidebar-item-active'
                    : ''
                }`}
                onClick={() => handleNavClick(item.id)}
                type="button"
              >
                <span className="ss-dash-sidebar-icon">
                  {item.icon}
                </span>
                <span className="ss-dash-sidebar-label">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>

          <div className="ss-dash-sidebar-footer">
            <button
              className="ss-dash-user-info"
              onClick={handleHeaderProfileClick}
              aria-label="Open profile"
              type="button"
            >
              <div className="ss-dash-user-avatar">SS</div>
              <div className="ss-dash-user-details">
                <span className="ss-dash-user-name">
                  Service Seeker
                </span>
                <span className="ss-dash-user-status">
                  Online
                </span>
              </div>
            </button>
          </div>
        </aside>
      )}

      {/* Main content — conditionally padded */}
      <main
        className={`ss-dash-main ${
          !isMobile && sidebarOpen
            ? 'ss-dash-main-shifted'
            : ''
        }`}
      >
        {useFullBleed ? (
          <div className="ss-dash-full-bleed">
            {renderActiveComponent()}
          </div>
        ) : (
          <div className="ss-dash-content-wrapper">
            {renderActiveComponent()}
          </div>
        )}
      </main>

      {/* Mobile bottom nav — icon only */}
      {isMobile && (
        <nav className="ss-dash-bottom-nav">
          {mobileNavItems.map((item) => (
            <button
              key={item.id}
              className={`ss-dash-nav-item ${
                activeTab === item.id && !showProfile
                  ? 'ss-dash-nav-item-active'
                  : ''
              }`}
              onClick={() => handleNavClick(item.id)}
              aria-label={item.label}
              type="button"
            >
              <span className="ss-dash-nav-icon">
                {item.icon}
              </span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default Serviceseekerdash;