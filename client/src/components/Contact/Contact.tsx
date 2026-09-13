import './contact.css';

function Contact() {
  return (
    <section className="contact-section" id="contact">
      <div className="contact-header">
        <p className="contact-eyebrow">Get in Touch</p>
        <h2 className="contact-title">Contact Us</h2>
        <p className="contact-subtitle">
          Have a question or need help finding the right service? Reach out — we
          would love to hear from you.
        </p>
      </div>

      <div className="contact-grid">
        {/* Phone */}
        <a href="tel:0758420860" className="contact-card">
          <span className="contact-icon" aria-hidden="true">📞</span>
          <h3 className="contact-label">Call Us</h3>
          <p className="contact-value">0758 420 860</p>
          <span className="contact-hint">Mon – Sat · 8:00 – 20:00</span>
        </a>

        {/* Email */}
        <a href="mailto:davismugoikou@gmail.com" className="contact-card">
          <span className="contact-icon" aria-hidden="true">✉️</span>
          <h3 className="contact-label">Email Us</h3>
          <p className="contact-value">davismugoikou@gmail.com</p>
          <span className="contact-hint">We reply within 24 hours</span>
        </a>

        {/* Website / Developer */}
        <a
          href="https://kinstryx.co.ke"
          target="_blank"
          rel="noopener noreferrer"
          className="contact-card"
        >
          <span className="contact-icon" aria-hidden="true">🌐</span>
          <h3 className="contact-label">Visit Us Online</h3>
          <p className="contact-value">nstryx.co.ke</p>
          <span className="contact-hint">Developed by Kinstry Systems</span>
        </a>
      </div>

      <div className="contact-cta">
        <p className="contact-cta-text">Ready to connect with a provider?</p>
        <button type="button" className="contact-cta-btn">
          Get Started →
        </button>
      </div>
    </section>
  );
}

export default Contact;