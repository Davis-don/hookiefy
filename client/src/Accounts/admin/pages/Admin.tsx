// Admin.tsx - Updated with Settings and Notifications routing
// ============================================================
// Admin.tsx - Admin Dashboard with Header and Sidebar
// ============================================================

import './admin.css'
import { IoAnalytics } from "react-icons/io5";
import { IoPeople } from "react-icons/io5";
import { IoWalletOutline } from "react-icons/io5";
import { IoPerson } from "react-icons/io5";
import { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'

// Import admin components
import AdminHeader from '../components/AdminHeader';
import AdminAnalytics from '../components/AdminAnalytics';
import AdminUsers from '../components/AdminUsers';
import AdminFinancials from '../components/AdminFinancials';
import AdminProfile from '../components/AdminProfile';
import AdminSettings from '../components/AdminSettings';
import AdminNotifications from '../components/AdminNotifications';
import Loadingcomponent from '../../common/components/Loading/Loadingcomponent';
import { useAuthStore } from '../../../store/authtokenstore';

// ============================================================
// MAIN COMPONENT
// ============================================================

function Admin() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [isLoading, setIsLoading] = useState(true);

  const { access: accessToken } = useAuthStore();

  // Simulate loading for admin data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle navigation click
  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
  };

  // ---- Render profile avatar content ----
  const renderProfileAvatar = () => {
    return (
      <div className="admin-profile-avatar-wrapper default-bg">
        <IoPerson className="admin-profile-avatar-icon" />
      </div>
    );
  };

  // Render the appropriate component based on active tab
  const renderContent = () => {
    if (isLoading) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          minHeight: '400px'
        }}>
          <Loadingcomponent />
        </div>
      );
    }

    switch(activeTab) {
      case 'analytics':
        return <AdminAnalytics />;
      case 'users':
        return <AdminUsers />;
      case 'financials':
        return <AdminFinancials />;
      case 'profile':
        return <AdminProfile />;
      case 'settings':
        return <AdminSettings />;
      case 'notifications':
        return <AdminNotifications />;
      default:
        return <AdminAnalytics />;
    }
  };

  // No token available
  if (!accessToken) {
    return (
      <div className="overall-admin-component-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔒</div>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
            Please login to continue
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overall-admin-component-container">
      {/* Header Bar */}
      <AdminHeader 
        activeTab={activeTab} 
        onNavClick={handleNavClick} 
      />

      <div className="admin-main-layout">
        {/* Sidebar / Navigation */}
        <div className="admin-account-header-container">
          <ul>
            <li 
              className={activeTab === 'analytics' ? 'active-nav' : ''}
              onClick={() => handleNavClick('analytics')}
            >
              <div className="admin-icon-fig"><IoAnalytics /></div>
              <div className="admin-nav-name">Analytics</div>
            </li>
            <li 
              className={activeTab === 'users' ? 'active-nav' : ''}
              onClick={() => handleNavClick('users')}
            >
              <div className="admin-icon-fig"><IoPeople /></div>
              <div className="admin-nav-name">Users</div>
            </li>
            <li 
              className={activeTab === 'financials' ? 'active-nav' : ''}
              onClick={() => handleNavClick('financials')}
            >
              <div className="admin-icon-fig"><IoWalletOutline /></div>
              <div className="admin-nav-name">Financials</div>
            </li>
            <li 
              className={`admin-profile-nav ${activeTab === 'profile' ? 'active-nav' : ''}`}
              onClick={() => handleNavClick('profile')}
            >
              {renderProfileAvatar()}
              <div className="admin-nav-name">Profile</div>
            </li>
          </ul>

          <div className="admin-sidebar-footer">
            <span>© 2026 Admin</span>
          </div>
        </div>

        {/* Main Body Content */}
        <div className="overall-admin-body-container">
          <div className="actual-admin-body-content-retainer">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Admin;