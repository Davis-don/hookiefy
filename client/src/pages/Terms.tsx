import { Link } from 'react-router-dom';
import './legal.css';

function Terms() {
  const updated = 'Last updated: January 2026';

  return (
    <main className="yp-legal-section">
      <div className="yp-legal-inner">

        <header className="yp-legal-head">
          <span className="yp-legal-eyebrow">Legal</span>
          <h1 className="yp-legal-title">Terms &amp; Conditions</h1>
          <p className="yp-legal-meta">{updated}</p>
        </header>

        <p className="yp-legal-lead">
          Welcome to Youpata. By creating an account or using our platform,
          you agree to the terms below. Please read them carefully — they
          explain what you can expect from us, and what we expect from you.
        </p>

        <section className="yp-legal-block">
          <h2>1. About Youpata</h2>
          <p>
            Youpata is a growth platform that helps small and medium
            businesses build systems, gain visibility, and market themselves
            using AI-powered tools. We are based in Kenya.
          </p>
        </section>

        <section className="yp-legal-block">
          <h2>2. Your Account</h2>
          <p>
            You must provide accurate information when creating your account.
            You are responsible for keeping your login details safe and for
            everything that happens under your account.
          </p>
          <p>
            You must be at least 18 years old, or have permission from a
            parent or guardian, to use Youpata.
          </p>
        </section>

        <section className="yp-legal-block">
          <h2>3. Acceptable Use</h2>
          <p>When using Youpata, you agree not to:</p>
          <ul>
            <li>Post false, misleading or harmful content</li>
            <li>Impersonate another person or business</li>
            <li>Use the platform for illegal activity</li>
            <li>Attempt to break, hack or overload our systems</li>
            <li>Copy, resell or misuse our software without permission</li>
          </ul>
        </section>

        <section className="yp-legal-block">
          <h2>4. Your Content</h2>
          <p>
            You keep ownership of the text, images and business information
            you upload. By posting it, you give Youpata permission to display
            it on the platform so customers can find you.
          </p>
        </section>

        <section className="yp-legal-block">
          <h2>5. AI Features</h2>
          <p>
            Our AI tools help suggest content, target the right audience and
            improve your visibility. AI suggestions are guidance, not
            guarantees. You are responsible for reviewing anything before it
            goes live on your business profile.
          </p>
        </section>

        <section className="yp-legal-block">
          <h2>6. Fees</h2>
          <p>
            Creating an account is free. Some features may have a cost in the
            future — we will always tell you clearly before charging you
            anything.
          </p>
        </section>

        <section className="yp-legal-block">
          <h2>7. Ending Your Account</h2>
          <p>
            You can close your account at any time. We may suspend or close
            accounts that break these terms or harm other users.
          </p>
        </section>

        <section className="yp-legal-block">
          <h2>8. Changes to These Terms</h2>
          <p>
            We may update these terms from time to time. When we do, we will
            update the date at the top of this page. Continuing to use
            Youpata means you accept the new terms.
          </p>
        </section>

        <section className="yp-legal-block">
          <h2>9. Contact</h2>
          <p>
            Questions about these terms? Reach us at{' '}
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
          <Link to="/privacy" className="yp-legal-link">
            Read our Privacy Policy →
          </Link>
        </div>

      </div>
    </main>
  );
}

export default Terms;