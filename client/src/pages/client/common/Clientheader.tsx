import { CiMenuBurger, CiSearch } from "react-icons/ci";
import { IoMdNotificationsOutline } from "react-icons/io";
import { useState, useEffect, useRef } from 'react';
import './clientheader.css';

interface HeaderProps {
  toggleSidebar: () => void;
}

function Header({ toggleSidebar }: HeaderProps) {
  const userInitials = "JD";
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
      if (window.innerWidth > 640) {
        setSearchOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.addEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearchClick = () => {
    setSearchOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  return (
    <>
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
            {!isMobile ? (
              <div className="ca-search-wrapper">
                <CiSearch className="ca-search-icon" />
                <input 
                  type="text" 
                  placeholder="Search matches, people..." 
                  className="ca-search-field"
                />
              </div>
            ) : (
              <button 
                className="ca-mobile-search-btn" 
                onClick={handleSearchClick}
                aria-label="Search"
              >
                <CiSearch />
              </button>
            )}
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

      {/* Mobile Search Overlay */}
      {isMobile && searchOpen && (
        <div className="ca-mobile-search-overlay" ref={searchRef}>
          <div className="ca-mobile-search-container">
            <CiSearch className="ca-mobile-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search matches, people..."
              className="ca-mobile-search-input"
            />
            <button 
              className="ca-mobile-search-close"
              onClick={() => setSearchOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;