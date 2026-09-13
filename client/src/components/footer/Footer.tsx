import './footer.css';

function Footer() {
  const year = new Date().getFullYear();

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
              Connecting you with trusted service providers right in your
              neighbourhood — fast, safe and affordable.
            </p>
          </div>

          {/* Links columns */}
          <div className="yp-footer-links">
            <div className="yp-footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="/about">About Us</a></li>
                <li><a href="/services">Services</a></li>
                <li><a href="/providers">Become a Provider</a></li>
                <li><a href="/careers">Careers</a></li>
              </ul>
            </div>

            <div className="yp-footer-col">
              <h4>Support</h4>
              <ul>
                <li><a href="/help">Help Center</a></li>
                <li><a href="/faq">FAQs</a></li>
                <li><a href="/terms">Terms of Service</a></li>
                <li><a href="/privacy">Privacy Policy</a></li>
              </ul>
            </div>

            <div className="yp-footer-col">
              <h4>Contact</h4>
              <ul>
                <li>
                  <a href="tel:0758420860">📞 0758 420 860</a>
                </li>
                <li>
                  <a href="mailto:davismugoikou@gmail.com">
                    ✉️ davismugoikou@gmail.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://nstryx.co.ke"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    🌐 kinstryx.co.ke
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
              href="https://nstryx.co.ke"
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