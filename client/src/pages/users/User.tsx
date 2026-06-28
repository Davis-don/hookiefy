import './user.css'
import { CiHome } from "react-icons/ci";
// import { RiMessage2Line } from "react-icons/ri";
import { IoSearch } from "react-icons/io5";
import { IoNotifications } from "react-icons/io5";
import { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'
import Submodalsuser from './Submodalsuser';
import Mypreference from './Mypreference';
import Myprofile from './Myprofile';
// Import components
import Home from './Home';
import Search from './Search';
// import Messages from './Messages';
import Notifications from './Notifications';
import Profile from './Profile';
import Loadingcomponent from '../../components/superadmin/Loadingcomponent';
import { useAuthStore } from '../../store/authtokenstore';

function User() {
  const [activeTab, setActiveTab] = useState('home');
  const [showProfileModal, setShowProfileModal] = useState(true);
  const [showPreferenceModal, setShowPreferenceModal] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasPreference, setHasPreference] = useState(false);
  const { access: accessToken } = useAuthStore();

  // Check if user has profile
  const checkProfile = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/profile/has-profile/`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to check profile status');
      }

      const data = await response.json();
      return data.has_profile;
    } catch (error) {
      console.error('Error checking profile:', error);
      return false;
    }
  };

  // Check if user has preference
  const checkPreference = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/preference/has-preference/`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to check preference status');
      }

      const data = await response.json();
      return data.has_preference;
    } catch (error) {
      console.error('Error checking preference:', error);
      return false;
    }
  };

  // Check both profile and preference status on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (!accessToken) {
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      try {
        const [profileExists, preferenceExists] = await Promise.all([
          checkProfile(),
          checkPreference()
        ]);

        setHasProfile(profileExists);
        setHasPreference(preferenceExists);

        // Show modals based on what's missing
        if (!profileExists) {
          setShowProfileModal(true);
          setShowPreferenceModal(false);
        } else if (!preferenceExists) {
          setShowPreferenceModal(true);
          setShowProfileModal(false);
        } else {
          setShowProfileModal(false);
          setShowPreferenceModal(false);
        }
      } catch (error) {
        console.error('Error checking status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [accessToken]);

  // Handle profile completion
  const handleProfileComplete = async () => {
    setShowProfileModal(false);
    // Re-check profile status
    const profileExists = await checkProfile();
    setHasProfile(profileExists);
    
    // If profile is complete but preference is missing, show preference modal
    if (profileExists && !hasPreference) {
      setShowPreferenceModal(true);
    }
  };

  // Handle preference completion
  const handlePreferenceComplete = async () => {
    setShowPreferenceModal(false);
    // Re-check preference status
    const preferenceExists = await checkPreference();
    setHasPreference(preferenceExists);
  };

  // Close sidebar on mobile when clicking a link (optional)
  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
  };

  // Render the appropriate component based on active tab
  const renderContent = () => {
    // If checking, show loading
    if (isChecking) {
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

    // If no profile or preference, show overlay message
    if (!hasProfile || !hasPreference) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          minHeight: '400px',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: '1rem',
            opacity: 0.3
          }}>
            📝
          </div>
          <h3 style={{ 
            color: '#ffffff', 
            marginBottom: '0.5rem',
            fontWeight: '300'
          }}>
            {!hasProfile && !hasPreference ? 'Complete Your Profile & Preferences' :
             !hasProfile ? 'Complete Your Profile' :
             'Complete Your Preferences'}
          </h3>
          <p style={{ 
            color: 'rgba(255,255,255,0.5)',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            Please complete your {!hasProfile && !hasPreference ? 'profile and preferences' :
             !hasProfile ? 'profile' : 'preferences'} to continue
          </p>
        </div>
      );
    }

    // Normal content rendering
    switch(activeTab) {
      case 'home':
        return <Home />;
      case 'search':
        return <Search />;
      // case 'messages':
      //   return <Messages />;
      case 'notifications':
        return <Notifications />;
      case 'profile':
        return <Profile />;
      default:
        return <Home />;
    }
  };

  // No token available
  if (!accessToken) {
    return (
      <div className="overall-user-component-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
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
    <div className="overall-user-component-container">
        {/* Sidebar / Navigation - Hidden when modals are shown */}
        {!showProfileModal && !showPreferenceModal && (
          <div className="user-account-header-container">
              <div className="user-brand">
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
                      className={`profile-user-nav ${activeTab === 'profile' ? 'active-nav' : ''}`}
                      onClick={() => handleNavClick('profile')}
                  >
                      <div className="profile-div-user rounded-circle"></div>
                      <div className="nav-name">Profile</div>
                  </li>
              </ul>
              <div className="user-sidebar-footer">
                  <span>© 2026</span>
              </div>
          </div>
        )}

        {/* Main Body Content */}
        <div className="overall-user-body-container">
            <div className="actual-body-content-retainer-user">
                {renderContent()}
            </div>
            <div className="statauses-user-container">
                {/* Payment/Status Modals - Unchanged */}
                <Submodalsuser/>
                
                {/* Profile Modal */}
                {showProfileModal && (
                  <Myprofile 
                    onComplete={handleProfileComplete}
                    onCancel={() => {}}
                  />
                )}
                
                {/* Preference Modal */}
                {showPreferenceModal && (
                  <Mypreference 
                    onComplete={handlePreferenceComplete}
                    onCancel={() => {}}
                  />
                )}
            </div>
        </div>
    </div>
  )
}

export default User