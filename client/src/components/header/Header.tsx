import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import './header.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function Header(): ReactElement {
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const closeAll = (): void => setMobileOpen(false);

  const scrollToSection = (id: string): void => {
    if (!id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 90;
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const handleNavClick = (id: string, e: React.MouseEvent<HTMLAnchorElement>): void => {
    e.preventDefault();
    closeAll();

    const target = id ? `/#${id}` : '/';

    if (location.pathname === '/') {
      setTimeout(() => scrollToSection(id), 60);
    } else {
      navigate(target);
    }
  };

  // IDs here MUST match the `id` attributes on your section components
  const navItems: { label: string; id: string; className: string }[] = [
    { label: 'Home',       id: '',             className: 'nav-link-home' },
    { label: 'About Us',   id: 'how-it-works', className: 'nav-link-about' },
    { label: 'Services',   id: 'services',     className: 'nav-link-services' },
    { label: 'Contact Us', id: 'contact',      className: 'nav-link-contact' },
  ];

  const LoginIcon = (): ReactElement => (
    <svg className="login-icon" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );

  const UserPlusIcon = (): ReactElement => (
    <svg className="create-icon" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );

  return (
    <header className="overall-homepage-header-container">
      <div className="header-content-data-container">
        <div className="logo-header-section">
          <Link
            to="/"
            className="logo-link"
            onClick={() => {
              closeAll();
              if (location.pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <h1 className="logo-wordmark pacifico-regular">
              <span className="logo-you">You</span>
              <span className="logo-p">p</span>
              <span className="logo-ata">ata</span>
            </h1>
          </Link>
        </div>

        <nav className="nav-links-section">
          <ul className="list-unstyled">
            {navItems.map(({ label, id, className }) => (
              <li key={label} className={className}>
                <Link
                  to={id ? `/#${id}` : '/'}
                  onClick={(e) => handleNavClick(id, e)}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="header-actions-group">
          <Link to="/login" className="login-link" onClick={closeAll}>
            <LoginIcon />
            <span>Login</span>
          </Link>

          <Link to="/register" className="create-account-btn" onClick={closeAll}>
            <UserPlusIcon />
            <span>Create Account</span>
          </Link>
        </div>

        <button
          type="button"
          className={`mobile-menu-toggle ${mobileOpen ? 'is-open' : ''}`}
          onClick={() => setMobileOpen((p) => !p)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          <span /><span /><span />
        </button>
      </div>

      <div className={`mobile-menu-panel ${mobileOpen ? 'open' : ''}`}>
        <ul className="list-unstyled mobile-nav-list">
          {navItems.map(({ label, id, className }) => (
            <li key={label} className={className}>
              <Link
                to={id ? `/#${id}` : '/'}
                onClick={(e) => handleNavClick(id, e)}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mobile-register-group">
          <Link to="/login" className="mobile-cta mobile-cta-login" onClick={closeAll}>
            <LoginIcon />
            <span>Login</span>
          </Link>

          <Link to="/register" className="mobile-cta mobile-cta-create" onClick={closeAll}>
            <UserPlusIcon />
            <span>Create Account</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;