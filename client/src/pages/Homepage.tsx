// ============================================================
// Homepage.tsx - Landing page for non-authenticated users
// ============================================================

import './homepage.css'
import { CiHome } from "react-icons/ci";
import { IoSearch } from "react-icons/io5";
import { IoNotifications } from "react-icons/io5";
import { IoPerson } from "react-icons/io5";
import { IoLogInOutline } from "react-icons/io5";
import { useState } from 'react';
import DefaultFeed from '../components/DefaultFeed';
import DefaultLogin from '../components/DefaultLogin';
import DefaultSignup from '../components/DefaultSignup';

// ============================================================
// MAIN COMPONENT
// ============================================================

function Homepage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  // Handle navigation - opens login modal for non-authenticated users
  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    
    // If not home tab, show login modal
    if (tab !== 'home') {
      setIsLoginModalOpen(true);
    } else {
      // If switching back to home, close the modal
      setIsLoginModalOpen(false);
    }
  };

  // Handle login button click from sidebar
  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  // Handle connect button click from posts
  const handleConnectClick = () => {
    setIsLoginModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsLoginModalOpen(false);
    setIsSignupModalOpen(false);
    // When modal closes, go back to home tab
    setActiveTab('home');
  };

  // Switch from Login to Signup
  const handleSwitchToSignup = () => {
    setIsLoginModalOpen(false);
    setIsSignupModalOpen(true);
  };

  // Switch from Signup to Login
  const handleSwitchToLogin = () => {
    setIsSignupModalOpen(false);
    setIsLoginModalOpen(true);
  };

  // ✅ Handle successful signup - show login modal
  const handleSignupSuccess = () => {
    // The signup success toast is already shown in the Signup component
    // Now we just open the login modal so user can login
    setIsLoginModalOpen(true);
  };

  return (
    <div className="overall-homepage-container">
      {/* Sidebar / Navigation */}
      <div className="homepage-header-container">
        <div className="homepage-brand">
          <h3>Hookiefy</h3>
        </div>
        <ul>
          <li 
            className={activeTab === 'home' ? 'active-nav' : ''}
            onClick={() => handleNavClick('home')}
          >
            <div className="icon-fig"><CiHome /></div>
            <div className="nav-name">Home</div>
          </li>
          <li 
            className={activeTab === 'search' ? 'active-nav' : ''}
            onClick={() => handleNavClick('search')}
          >
            <div className="icon-fig"><IoSearch /></div>
            <div className="nav-name">Search</div>
          </li>
          <li 
            className={activeTab === 'notifications' ? 'active-nav' : ''}
            onClick={() => handleNavClick('notifications')}
          >
            <div className="icon-fig"><IoNotifications /></div>
            <div className="nav-name">Notifications</div>
          </li>
          <li 
            className={`profile-nav-item ${activeTab === 'profile' ? 'active-nav' : ''}`}
            onClick={() => handleNavClick('profile')}
          >
            <div className="homepage-profile-avatar-wrapper default-bg">
              <IoPerson className="homepage-profile-avatar-icon" />
            </div>
            <div className="nav-name">Profile</div>
          </li>
        </ul>

        {/* Login Button - TikTok style */}
        <div className="homepage-login-section">
          <button 
            className="homepage-login-btn"
            onClick={handleLoginClick}
          >
            <IoLogInOutline className="homepage-login-icon" />
            <span className="homepage-login-text">Login</span>
          </button>
        </div>

        <div className="homepage-sidebar-footer">
          <span>© 2026</span>
        </div>
      </div>

      {/* Main Body Content */}
      <div className="overall-homepage-body-container">
        <div className="actual-body-content-retainer-homepage">
          <DefaultFeed onConnectClick={handleConnectClick} />
        </div>
        <div className="homepage-statuses-container">
          {/* Status indicators can go here */}
        </div>
      </div>

      {/* Login Modal - Slides up from bottom */}
      <DefaultLogin 
        isOpen={isLoginModalOpen}
        onClose={handleModalClose}
        onSwitchToSignup={handleSwitchToSignup}
      />

      {/* Signup Modal - Slides up from bottom */}
      <DefaultSignup 
        isOpen={isSignupModalOpen}
        onClose={handleModalClose}
        onSwitchToLogin={handleSwitchToLogin}
        onSignupSuccess={handleSignupSuccess}
      />
    </div>
  );
}

export default Homepage;