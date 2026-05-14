import React, { useState } from "react";
import { CiMenuBurger } from "react-icons/ci";
import { IoMdNotificationsOutline } from "react-icons/io";
import { FaSearch, FaArrowLeft } from "react-icons/fa";
import './clientheader.css';

interface HeaderProps {
  toggleSidebar: () => void;
  unreadCount?: number;
  onNotificationClick?: () => void;
  onSearch?: (query: string) => void;
}

function Header({ toggleSidebar, unreadCount = 0, onNotificationClick, onSearch }: HeaderProps) {
  const userInitials = "JD";
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleNotificationClick = () => {
    if (onNotificationClick) {
      onNotificationClick();
    }
  };

  const handleSearchClick = () => {
    setIsSearchExpanded(true);
  };

  const handleSearchClose = () => {
    setIsSearchExpanded(false);
    setSearchQuery('');
    if (onSearch) {
      onSearch('');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery) {
      onSearch(searchQuery);
    }
    // Optional: Close search after submit on mobile
    // setIsSearchExpanded(false);
  };

  return (
    <header className="ca-header">
      <div className="ca-header-container">
        {/* Left Section - Menu and Logo (hidden when search expanded on mobile) */}
        <div className={`ca-header-left ${isSearchExpanded ? 'ca-hidden-mobile' : ''}`}>
          <button className="ca-hamburger-btn" onClick={toggleSidebar} aria-label="Menu">
            <CiMenuBurger />
          </button>
          <a href="/" className="ca-brand-logo">
            Hookiefy
          </a>
        </div>

        {/* Search Bar - Expandable on Mobile */}
        <div className={`ca-header-search ${isSearchExpanded ? 'ca-search-expanded' : ''}`}>
          {isSearchExpanded && (
            <button className="ca-search-back-btn" onClick={handleSearchClose} aria-label="Back">
              <FaArrowLeft />
            </button>
          )}
          <form className="ca-search-wrapper" onSubmit={handleSearchSubmit}>
            <FaSearch className="ca-search-icon" />
            <input
              type="text"
              placeholder={isSearchExpanded ? "Search..." : "Search profiles, messages..."}
              value={searchQuery}
              onChange={handleSearchChange}
              onClick={handleSearchClick}
              onFocus={handleSearchClick}
              className="ca-search-input"
              autoFocus={isSearchExpanded}
            />
          </form>
        </div>

        {/* Right Section - Notifications and Profile (hidden when search expanded on mobile) */}
        <div className={`ca-header-right ${isSearchExpanded ? 'ca-hidden-mobile' : ''}`}>
          <button 
            className="ca-notification-icon" 
            aria-label="Notifications"
            onClick={handleNotificationClick}
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