import { CiMenuBurger } from "react-icons/ci";
import { IoMdNotificationsOutline } from "react-icons/io";
import './clientheader.css';

interface HeaderProps {
  toggleSidebar: () => void;
  unreadCount?: number;
  onNotificationClick?: () => void;
}

function Header({ toggleSidebar, unreadCount = 0, onNotificationClick }: HeaderProps) {
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

        <div className="ca-header-right">
          <button 
            className="ca-notification-icon" 
            aria-label="Notifications"
            onClick={onNotificationClick}
          >
            <IoMdNotificationsOutline />
            {unreadCount > 0 && (
              <span className="ca-notification-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
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