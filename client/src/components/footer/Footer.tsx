import './footer.css';
import { useNavigate } from 'react-router-dom';

function Footer() {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
    window.scrollTo(0, 0);
  };

  const navigationLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
  ];

  return (
    <footer className="hookify-footer">
      <div className="hookify-footer-container">
        {/* Footer Links */}
        <div className="hookify-footer-links">
          {navigationLinks.map((link, index) => (
            <button
              key={index}
              onClick={() => handleNavigation(link.path)}
              className="hookify-footer-link"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Copyright Section */}
        <div className="hookify-footer-copyright">
          <p className="hookify-copyright-text">
            © {new Date().getFullYear()} Hookify. All rights reserved.
          </p>
          <p className="hookify-copyright-tagline">
            Building connections since 2026
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;