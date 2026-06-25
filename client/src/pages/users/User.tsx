import './user.css'
import { CiHome } from "react-icons/ci";
import { RiMessage2Line } from "react-icons/ri";
import { IoSearch } from "react-icons/io5";
import { IoNotifications } from "react-icons/io5";
import { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'

// Import components
import Home from './Home';
import Search from './Search';
import Messages from './Messages';
import Notifications from './Notifications';
import Profile from './Profile';

function User() {
  const [activeTab, setActiveTab] = useState('home');

  // Close sidebar on mobile when clicking a link (optional)
  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
  };

  // Render the appropriate component based on active tab
  const renderContent = () => {
    switch(activeTab) {
      case 'home':
        return <Home />;
      case 'search':
        return <Search />;
      case 'messages':
        return <Messages />;
      case 'notifications':
        return <Notifications />;
      case 'profile':
        return <Profile />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="overall-user-component-container">
        {/* Sidebar / Navigation */}
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
                    className={activeTab === 'messages' ? 'active-nav' : ''}
                    onClick={() => handleNavClick('messages')}
                >
                    <div className="icon-fig"><RiMessage2Line /></div>
                    <div className="nav-name">Messages</div>
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

        {/* Main Body Content */}
        <div className="overall-user-body-container">
            <div className="actual-body-content-retainer-user">
                {renderContent()}
            </div>
        </div>
    </div>
  )
}

export default User