import { useState, useRef, useEffect } from 'react';
import type { ReactElement } from 'react';
import './Header.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link, useLocation } from 'react-router-dom';

function Header(): ReactElement {
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();

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

  // Close menus whenever route changes
  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const closeAll = (): void => {
    setDropdownOpen(false);
    setMobileOpen(false);
  };

  const scrollToTop = (): void => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (): void => {
    closeAll();
    scrollToTop();
  };

  /** Returns true when the given path matches the current route */
  const isActive = (path: string): boolean => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Nav items in one place so desktop + mobile stay in sync
  const navItems: { label: string; to: string; className: string }[] = [
    { label: 'Home',            to: '/',            className: 'nav-link-home' },
    { label: 'About Us',        to: '/about',       className: 'nav-link-about' },
    { label: 'Services',        to: '/services',    className: 'nav-link-services' },
    { label: 'Connection Types',to: '/connections', className: 'nav-link-connections' },
    { label: 'Contact Us',      to: '/contact',     className: 'nav-link-contact' },
  ];

  return (
    <header className="overall-homepage-header-container">
      <div className="header-content-data-container">

        {/* ── LOGO ────────────────────────────────────────────── */}
        <div className="logo-header-section">
          <Link to="/" className="logo-link" onClick={handleNavClick}>
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
            {navItems.map(({ label, to, className }) => (
              <li key={to} className={className}>
                <Link
                  to={to}
                  onClick={handleNavClick}
                  className={isActive(to) ? 'active' : ''}
                  aria-current={isActive(to) ? 'page' : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
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
                onClick={handleNavClick}
              >
                Service Seeker
              </Link>

              <Link
                to="/signup/service-provider"
                className="dropdown-item dropdown-item-provider"
                role="menuitem"
                onClick={handleNavClick}
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
          {navItems.map(({ label, to, className }) => (
            <li key={to} className={className}>
              <Link
                to={to}
                onClick={handleNavClick}
                className={isActive(to) ? 'active' : ''}
                aria-current={isActive(to) ? 'page' : undefined}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mobile-register-group">
          <Link
            to="/signup/service-seeker"
            className="mobile-cta mobile-cta-seeker"
            onClick={handleNavClick}
          >
            Service Seeker
          </Link>
          <Link
            to="/signup/service-provider"
            className="mobile-cta mobile-cta-provider"
            onClick={handleNavClick}
          >
            Service Provider
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;