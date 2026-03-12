import { CiMenuBurger, CiSearch } from "react-icons/ci";
import { IoMdNotificationsOutline } from "react-icons/io";
import './clientheader.css';

interface HeaderProps {
  toggleSidebar: () => void;
}

function Header({ toggleSidebar }: HeaderProps) {
  const userInitials = "JD";
  
  return (
    <header className="ca-header">
      <div className="ca-header-container">
        <div className="ca-header-left">
          <button className="ca-hamburger-btn" onClick={toggleSidebar} aria-label="Menu">
            <CiMenuBurger />
          </button>
          <a href="/" className="ca-brand-logo">
            Hookiefy
          </a>
        </div>

        <div className="ca-header-search">
          <div className="ca-search-wrapper">
            <CiSearch className="ca-search-icon" />
            <input 
              type="text" 
              placeholder="Search matches, people..." 
              className="ca-search-field"
            />
          </div>
        </div>

        <div className="ca-header-right">
          <button className="ca-notification-icon" aria-label="Notifications">
            <IoMdNotificationsOutline />
            <span className="ca-notification-badge">3</span>
          </button>
          <div className="ca-user-avatar" title="John Doe">
            <span className="ca-avatar-initials">{userInitials}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;