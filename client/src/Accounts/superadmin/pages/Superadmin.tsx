// Superadmin.tsx - Super Admin Dashboard with Header and Sidebar
// ============================================================

import './superadmin.css'
import { IoHome } from "react-icons/io5";
import { IoPeople } from "react-icons/io5";
import { IoWalletOutline } from "react-icons/io5";
import { IoImageOutline } from "react-icons/io5"; // Advert icon
import { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'

// Import superadmin components
import SuperadminHeader from '../components/SuperadminHeader';
import SuperadminHome from '../components/SuperadminHome';
import SuperadminUsers from '../components/SuperadminUsers';
import SuperadminFinancials from '../components/SuperadminFinancials';
import SuperadminProfile from '../components/SuperadminProfile';
import SuperadminSettings from '../components/SuperadminSettings';
import SuperadminNotifications from '../components/SuperadminNotifications';
import SuperadminAdverts from '../components/SuperadminAdverts';
import Loadingcomponent from '../../common/components/Loading/Loadingcomponent';
import { useAuthStore } from '../../../store/authtokenstore';

// ============================================================
// MAIN COMPONENT
// ============================================================

function Superadmin() {
  const [activeTab, setActiveTab] = useState('home');
  const [isLoading, setIsLoading] = useState(true);

  const { access: accessToken } = useAuthStore();

  // Simulate loading for superadmin data
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
      case 'home':
        return <SuperadminHome />;
      case 'users':
        return <SuperadminUsers />;
      case 'financials':
        return <SuperadminFinancials />;
      case 'profile':
        return <SuperadminProfile />;
      case 'settings':
        return <SuperadminSettings />;
      case 'notifications':
        return <SuperadminNotifications />;
      case 'adverts':
        return <SuperadminAdverts />;
      default:
        return <SuperadminHome />;
    }
  };

  // No token available
  if (!accessToken) {
    return (
      <div className="overall-super-admin-account-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
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
    <div className="overall-super-admin-account-page">
      {/* Header Bar */}
      <SuperadminHeader 
        activeTab={activeTab} 
        onNavClick={handleNavClick} 
      />

      <div className="superadmin-main-layout">
        {/* Sidebar / Navigation */}
        <div className="superadmin-account-header-container">
          <ul>
            <li 
              className={activeTab === 'home' ? 'active-nav' : ''}
              onClick={() => handleNavClick('home')}
            >
              <div className="superadmin-icon-fig"><IoHome /></div>
              <div className="superadmin-nav-name">Home</div>
            </li>
            <li 
              className={activeTab === 'users' ? 'active-nav' : ''}
              onClick={() => handleNavClick('users')}
            >
              <div className="superadmin-icon-fig"><IoPeople /></div>
              <div className="superadmin-nav-name">Users</div>
            </li>
            <li 
              className={activeTab === 'financials' ? 'active-nav' : ''}
              onClick={() => handleNavClick('financials')}
            >
              <div className="superadmin-icon-fig"><IoWalletOutline /></div>
              <div className="superadmin-nav-name">Financials</div>
            </li>
            <li 
              className={activeTab === 'adverts' ? 'active-nav' : ''}
              onClick={() => handleNavClick('adverts')}
            >
              <div className="superadmin-icon-fig"><IoImageOutline /></div>
              <div className="superadmin-nav-name">Adverts</div>
            </li>
          </ul>

          <div className="superadmin-sidebar-footer">
            <span>© 2026 Super Admin</span>
            <span className="superadmin-version-badge">v2.0</span>
          </div>
        </div>

        {/* Main Body Content */}
        <div className="overall-superadmin-body-container">
          <div className="actual-superadmin-body-content-retainer">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Superadmin;