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

  /**
   * Scroll smoothly to a section by id.
   * If the id is empty, we scroll to the top (Home).
   */
  const scrollToSection = (id: string): void => {
    if (!id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 90; // account for sticky header height
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const handleNavClick = (id: string): void => {
    closeAll();
    setTimeout(() => scrollToSection(id), 60);
  };

  // Nav items point to homepage sections
  const navItems: { label: string; id: string; className: string }[] = [
    { label: 'Home',      id: '',              className: 'nav-link-home' },
    { label: 'About Us',  id: 'how-it-works',  className: 'nav-link-about' },
    { label: 'Services',  id: 'services',      className: 'nav-link-services' },
    { label: 'Contact Us',id: 'contact',       className: 'nav-link-contact' },
  ];

  return (
    <header className="overall-homepage-header-container">
      <div className="header-content-data-container">

        {/* ── LOGO ────────────────────────────────────────────── */}
        <div className="logo-header-section">
          <Link
            to="/"
            className="logo-link"
            onClick={() => {
              closeAll();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
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
            {navItems.map(({ label, id, className }) => (
              <li key={label} className={className}>
                <Link
                  to={id ? `/#${id}` : '/'}
                  onClick={(e) => {
                    if (location.pathname === '/') {
                      e.preventDefault();
                      handleNavClick(id);
                    } else {
                      handleNavClick(id);
                    }
                  }}
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
                to="/serviceseeker"
                className="dropdown-item dropdown-item-seeker"
                role="menuitem"
                onClick={closeAll}
              >
                Service Seeker
              </Link>

              <Link
                to="/serviceprovider"
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
          {navItems.map(({ label, id, className }) => (
            <li key={label} className={className}>
              <Link
                to={id ? `/#${id}` : '/'}
                onClick={(e) => {
                  if (location.pathname === '/') {
                    e.preventDefault();
                    handleNavClick(id);
                  } else {
                    handleNavClick(id);
                  }
                }}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mobile-register-group">
          <Link
            to="/serviceseeker"
            className="mobile-cta mobile-cta-seeker"
            onClick={closeAll}
          >
            Service Seeker
          </Link>
          <Link
            to="/serviceprovider"
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