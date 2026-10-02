import { Link, useLocation, useNavigate } from 'react-router-dom';
import './footer.css';

function Footer() {
  const year = new Date().getFullYear();
  const location = useLocation();
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const goToSection = (id: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (location.pathname === '/') {
      setTimeout(() => scrollToSection(id), 60);
    } else {
      navigate(id ? `/#${id}` : '/');
    }
  };

  return (
    <footer className="yp-footer">
      <div className="yp-footer-inner">

        {/* Top: brand + link columns */}
        <div className="yp-footer-top">

          {/* Brand column */}
          <div className="yp-footer-brand">
            <h3 className="yp-footer-logo">
              <span className="yp-footer-you">You</span>
              <span className="yp-footer-p">p</span>
              <span className="yp-footer-ata">ata</span>
            </h3>
            <p className="yp-footer-tagline">
              Helping small and medium businesses build systems, gain
              visibility, and grow with AI-powered marketing — all in one
              place.
            </p>
          </div>

          {/* Links columns */}
          <div className="yp-footer-links">

            <div className="yp-footer-col">
              <h4>Explore</h4>
              <ul>
                <li>
                  <Link to="/" onClick={(e) => goToSection('', e)}>Home</Link>
                </li>
                <li>
                  <Link to="/#how-it-works" onClick={(e) => goToSection('how-it-works', e)}>
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/#services" onClick={(e) => goToSection('services', e)}>
                    Services
                  </Link>
                </li>
                <li>
                  <Link to="/#faq" onClick={(e) => goToSection('faq', e)}>
                    FAQs
                  </Link>
                </li>
              </ul>
            </div>

            <div className="yp-footer-col">
              <h4>Get Started</h4>
              <ul>
                <li>
                  <Link to="/register">Create Account</Link>
                </li>
                <li>
                  <Link to="/login">Login</Link>
                </li>
                <li>
                  <Link to="/#contact" onClick={(e) => goToSection('contact', e)}>
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>

            <div className="yp-footer-col">
              <h4>Legal</h4>
              <ul>
                <li>
                  <Link to="/terms">Terms &amp; Conditions</Link>
                </li>
                <li>
                  <Link to="/privacy">Privacy Policy</Link>
                </li>
              </ul>
            </div>

            <div className="yp-footer-col">
              <h4>Contact</h4>
              <ul>
                <li>
                  <a href="tel:+254758420860">📞 0758 420 860</a>
                </li>
                <li>
                  <a href="mailto:davismugoikou@gmail.com">
                    ✉️ davismugoikou@gmail.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/254758420860"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    💬 WhatsApp
                  </a>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="yp-footer-bottom">
          <p>
            © {year} Youpata. All rights reserved. · Developed by{' '}
            <a
              href="https://kinstryx.co.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="yp-footer-credit"
            >
              Kinstry Systems
            </a>
          </p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;