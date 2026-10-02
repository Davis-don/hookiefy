import { Link } from 'react-router-dom';
import './legal.css';

function Privacy() {
  const updated = 'Last updated: January 2026';

  return (
    <main className="yp-legal-section">
      <div className="yp-legal-inner">

        <header className="yp-legal-head">
          <span className="yp-legal-eyebrow">Legal</span>
          <h1 className="yp-legal-title">Privacy Policy</h1>
          <p className="yp-legal-meta">{updated}</p>
        </header>

        <p className="yp-legal-lead">
          Your privacy matters. This page explains what information Youpata
          collects, how we use it, and the choices you have.
        </p>

        <section className="yp-legal-block">
          <h2>1. What We Collect</h2>
          <ul>
            <li>Your name, email and phone number when you sign up</li>
            <li>Business details you add to your profile</li>
            <li>Content you upload (text, images, prices, offers)</li>
            <li>Basic usage data — pages visited, device type, general location</li>
          </ul>
        </section>

        <section className="yp-legal-block">
          <h2>2. How We Use It</h2>
          <ul>
            <li>To create and manage your account</li>
            <li>To show your business to the right customers</li>
            <li>To improve our AI tools and platform</li>
            <li>To contact you about your account or important updates</li>
          </ul>
        </section>

        <section className="yp-legal-block">
          <h2>3. Sharing</h2>
          <p>
            We do not sell your personal data. We only share information with
            trusted service providers who help us run the platform (for
            example, hosting and email), and only as needed.
          </p>
        </section>

        <section className="yp-legal-block">
          <h2>4. Your Choices</h2>
          <p>
            You can update or delete most of your information from your
            account at any time. To close your account and remove your data,
            contact us.
          </p>
        </section>

        <section className="yp-legal-block">
          <h2>5. Security</h2>
          <p>
            We take reasonable steps to keep your information safe. No system
            is 100% secure, so please use a strong password and keep your
            login details private.
          </p>
        </section>

        <section className="yp-legal-block">
          <h2>6. Contact</h2>
          <p>
            Questions about privacy? Email{' '}
            <a href="mailto:davismugoikou@gmail.com">
              davismugoikou@gmail.com
            </a>{' '}
            or call{' '}
            <a href="tel:+254758420860">0758 420 860</a>.
          </p>
        </section>

        <div className="yp-legal-actions">
          <Link to="/register" className="yp-legal-btn">
            Back to sign up
          </Link>
          <Link to="/terms" className="yp-legal-link">
            Read our Terms &amp; Conditions →
          </Link>
        </div>

      </div>
    </main>
  );
}

export default Privacy;