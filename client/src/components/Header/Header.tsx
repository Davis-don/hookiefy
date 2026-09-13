import { useState, useRef, useEffect } from 'react';
import type { ReactElement } from 'react';
import './Header.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link } from 'react-router-dom';

function Header(): ReactElement {
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click + Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const closeAll = (): void => {
    setDropdownOpen(false);
    setMobileOpen(false);
  };

  return (
    <header className="overall-homepage-header-container">
      <div className="header-content-data-container">

        {/* ── LOGO ────────────────────────────────────────────── */}
        <div className="logo-header-section">
          <Link to="/" className="logo-link" onClick={closeAll}>
            <h1 className="logo-wordmark pacifico-regular">
              <span className="logo-you">You</span>
              <span className="logo-p">p</span>
              <span className="logo-ata">ata</span>
            </h1>
          </Link>
        </div>

        {/* ── NAV LINKS ───────────────────────────────────────── */}
        <nav className="nav-links-section">
          <ul className="list-unstyled">
            <li className="nav-link-home"><a href="#home">Home</a></li>
            <li className="nav-link-about"><a href="#about">About Us</a></li>
            <li className="nav-link-services"><a href="#services">Services</a></li>
            <li className="nav-link-connections"><a href="#connections">Connection Types</a></li>
            <li className="nav-link-contact"><a href="#contact">Contact Us</a></li>
          </ul>
        </nav>

        {/* ── REGISTER DROPDOWN ───────────────────────────────── */}
        <div className="call-to-action-header-button" ref={dropdownRef}>
          <button
            type="button"
            className={`btn register-btn ${dropdownOpen ? 'is-open' : ''}`}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <span>Register</span>
            <svg
              className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="register-dropdown" role="menu">
              <Link
                to="/signup/service-seeker"
                className="dropdown-item dropdown-item-seeker"
                role="menuitem"
                onClick={closeAll}
              >
                Service Seeker
              </Link>

              <Link
                to="/signup/service-provider"
                className="dropdown-item dropdown-item-provider"
                role="menuitem"
                onClick={closeAll}
              >
                Service Provider
              </Link>
            </div>
          )}
        </div>

        {/* ── MOBILE HAMBURGER ────────────────────────────────── */}
        <button
          type="button"
          className={`mobile-menu-toggle ${mobileOpen ? 'is-open' : ''}`}
          onClick={() => setMobileOpen((p) => !p)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* ── MOBILE MENU ──────────────────────────────────────── */}
      <div className={`mobile-menu-panel ${mobileOpen ? 'open' : ''}`}>
        <ul className="list-unstyled mobile-nav-list">
          <li className="nav-link-home"><a href="#home" onClick={closeAll}>Home</a></li>
          <li className="nav-link-about"><a href="#about" onClick={closeAll}>About Us</a></li>
          <li className="nav-link-services"><a href="#services" onClick={closeAll}>Services</a></li>
          <li className="nav-link-connections"><a href="#connections" onClick={closeAll}>Connection Types</a></li>
          <li className="nav-link-contact"><a href="#contact" onClick={closeAll}>Contact Us</a></li>
        </ul>

        <div className="mobile-register-group">
          <Link
            to="/signup/service-seeker"
            className="mobile-cta mobile-cta-seeker"
            onClick={closeAll}
          >
            Service Seeker
          </Link>
          <Link
            to="/signup/service-provider"
            className="mobile-cta mobile-cta-provider"
            onClick={closeAll}
          >
            Service Provider
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;