import { useState } from 'react';
import Header from './common/Clientheader';
import HomeContent from './Homecontent';
import NotificationsContent from './NotificationsContent';
import ProfileContent from './ProfileContent';
import BillingContent from './BillingContent';
import './clientaccount.css';

function Clientaccount() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('home');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = () => {
    alert('Logout clicked - User would be logged out');
    // Add actual logout logic here later
  };

  const menuItems = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'notifications', icon: '🔔', label: 'Notifications', count: 5 },
    { id: 'profile', icon: '👤', label: 'Profile' },
    { id: 'billing', icon: '💰', label: 'Billing & Transfers' }
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
                onClick={() => setActivePage(item.id)}
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
              className="ca-nav-item ca-nav-logout"
              onClick={handleLogout}
            >
              <span className="ca-nav-icon">🚪</span>
              <span className="ca-nav-label">Logout</span>
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

        <main className="ca-main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default Clientaccount;