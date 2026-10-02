import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './hero.css';
import Africanbusiness from '../../assets/images/wietse-jongsma--OAYEZu641U-unsplash.jpg'

function Hero() {
  // Rotating words — what Youpata does for businesses
  const outcomes = [
    'Build Systems',
    'Gain Visibility',
    'Reach More Customers',
    'Scale Profitably',
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % outcomes.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [outcomes.length]);

  return (
    <section className="yp-hero-section">
      {/* Full-area background image */}
      <div className="yp-hero-bg" />
      <div className="yp-hero-overlay" />

      {/* Left text side */}
      <div className="yp-hero-content">
        <div className="yp-hero-text">
          <span className="yp-hero-eyebrow">
            Built for small and medium businesses
          </span>

          <h1 className="yp-hero-title">
            We Help Your Business
            <br />
            <span className="yp-hero-highlight">{outcomes[index]}</span>
          </h1>

          <p className="yp-hero-tagline">Systems • Visibility • Growth</p>

          <p className="yp-hero-subtitle">
            From the kiosk on the corner to the shop around the block —
            Youpata gives small business owners the systems, visibility and
            marketing to grow big.
          </p>

          <div className="yp-hero-buttons">
            {/* Primary CTA — create account */}
            <Link to="/register" className="yp-hero-btn yp-hero-btn-primary">
              <span>Get Started Free</span>
              <svg
                className="yp-hero-btn-arrow"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>

            {/* Secondary CTA — see what we do */}
            <a
              href="#services"
              className="yp-hero-btn yp-hero-btn-secondary"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById('services');
                if (el) {
                  const top =
                    el.getBoundingClientRect().top + window.scrollY - 90;
                  window.scrollTo({ top, behavior: 'smooth' });
                }
              }}
            >
              <span>See What We Do</span>
            </a>
          </div>

          {/* Small trust line under buttons */}
          <p className="yp-hero-trust">
            No credit card needed • Set up in minutes • Cancel anytime
          </p>
        </div>
      </div>

      {/* Right arc cut-out — image arching from the right edge */}
      <div className="yp-hero-arc">
        <img
          src={Africanbusiness}
          alt="A small business owner in her shop"
          className="yp-hero-image"
        />
      </div>
    </section>
  );
}

export default Hero;