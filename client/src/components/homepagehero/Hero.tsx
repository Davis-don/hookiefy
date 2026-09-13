import { useState, useEffect } from 'react';
import './hero.css';

function Hero() {
  const services = ['Plumbers', 'Tutors', 'Electricians', 'Carpenters', 'Cleaners'];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % services.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [services.length]);

  return (
    <section className="yp-hero-section">
      {/* Full-area background image */}
      <div className="yp-hero-bg" />
      <div className="yp-hero-overlay" />

      {/* Left text side */}
      <div className="yp-hero-content">
        <div className="yp-hero-text">
          <span className="yp-hero-eyebrow">Youpata — Your Neighbourhood Pros</span>

          <h1 className="yp-hero-title">
            Your Reliable
            <br />
            <span className="yp-hero-highlight">{services[index]} Near You</span>
          </h1>

          <p className="yp-hero-tagline">Fast • Safe • Affordable</p>

          <p className="yp-hero-subtitle">
            Find a teacher, book a plumber or hire any skilled pro you need —
            anytime, anywhere, right in your neighbourhood with Youpata.
          </p>

          <div className="yp-hero-buttons">
            <button type="button" className="yp-hero-btn yp-hero-btn-primary">
              Find a Service
            </button>
            <button type="button" className="yp-hero-btn yp-hero-btn-secondary">
              Become a Provider
            </button>
          </div>
        </div>
      </div>

      {/* Right arc cut-out — image arching from the right edge */}
      <div className="yp-hero-arc">
        <img
          src="https://images.unsplash.com/photo-1753892208868-a26e9966e770?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="African teacher teaching at a chalkboard"
        />
      </div>
    </section>
  );
}

export default Hero;