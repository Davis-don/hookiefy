import { useNavigate } from 'react-router-dom';
import './homepage.css';

function Homepage() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login'); // Updated to go to /login instead of /
  };

  const handleGetStartedClick = () => {
    navigate('/login'); // Also goes to login page
  };

  return (
    <div className="overall-homepage-container">
      {/* Navigation Bar */}
      <nav className="homepage-nav">
        <div className="nav-logo">
          <h2>Hookify<span>Love</span></h2>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <button className="nav-login-btn" onClick={handleLoginClick}>
            Login <span className="btn-heart">❤️</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="homepage-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Find Your Perfect
            <span className="hero-highlight"> Love Story</span>
          </h1>
          <p className="hero-subtitle">
            Connect with meaningful relationships in a beautiful way
          </p>
          <div className="hero-buttons">
            <button className="hero-btn primary" onClick={handleGetStartedClick}>
              Get Started
              <span className="btn-arrow">→</span>
            </button>
            <button className="hero-btn secondary" onClick={handleLoginClick}>
              Login
            </button>
          </div>
        </div>
        <div className="hero-decoration">
          <div className="floating-heart">❤️</div>
          <div className="floating-heart">💖</div>
          <div className="floating-heart">💕</div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="homepage-features">
        <h2 className="section-title">Why Choose Hookify?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">💑</div>
            <h3>Meaningful Connections</h3>
            <p>Find genuine relationships based on compatibility and shared interests</p>
            <button className="feature-btn" onClick={handleLoginClick}>
              Learn More
            </button>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Safe & Secure</h3>
            <p>Your privacy and safety are our top priorities</p>
            <button className="feature-btn" onClick={handleLoginClick}>
              Learn More
            </button>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✨</div>
            <h3>Smart Matching</h3>
            <p>Advanced algorithms to help you find your perfect match</p>
            <button className="feature-btn" onClick={handleLoginClick}>
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="homepage-about">
        <div className="about-content">
          <h2 className="section-title">About Hookify</h2>
          <p>
            Hookify is a modern dating platform designed to help people find 
            meaningful connections. We believe in the power of love and the 
            beauty of genuine relationships.
          </p>
          <div className="stats-container">
            <div className="stat-item">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Happy Users</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Success Stories</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Support</span>
            </div>
          </div>
          <button className="about-btn" onClick={handleLoginClick}>
            Join Our Community
          </button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="homepage-cta">
        <div className="cta-content">
          <h2>Ready to Find Your Love Story?</h2>
          <p>Join thousands of happy couples who found each other on Hookify</p>
          <button className="cta-btn" onClick={handleLoginClick}>
            Login to Get Started
            <span className="btn-heart">❤️</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="homepage-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <h3>Hookify<span>Love</span></h3>
          </div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
          <div className="footer-social">
            <span className="social-icon">📱</span>
            <span className="social-icon">💬</span>
            <span className="social-icon">📷</span>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 HookifyLove. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Homepage;