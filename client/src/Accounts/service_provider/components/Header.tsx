import React from 'react';
import './header.css'

interface HeaderProps {
  onProfileClick: () => void;
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ onProfileClick, userName = 'SP' }) => {
  return (
    <header className="yp-dash-header">
      <div className="yp-dash-header-content">
        <h1 className="yp-dash-wordmark">
          <span className="yp-logo-you">You</span>
          <span className="yp-logo-p">p</span>
          <span className="yp-logo-ata">ata</span>
        </h1>

        <button
          className="yp-dash-avatar-btn"
          onClick={onProfileClick}
          aria-label="Open profile"
          type="button"
        >
          <div className="yp-dash-avatar">{userName}</div>
        </button>
      </div>
    </header>
  );
};

export default Header;