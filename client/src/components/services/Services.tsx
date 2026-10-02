import { Link } from 'react-router-dom';
import './services.css';

function Services() {
  const services = [
    {
      title: 'Business Systems',
      text: 'Set up the tools and workflows that keep your shop, salon or service running smoothly — even on your busiest days.',
    },
    {
      title: 'Visibility & Getting Found',
      text: 'Make sure customers searching for what you offer actually find you — online, on the map, and on the platforms they use.',
    },
    {
      title: 'Marketing That Sells',
      text: 'Smart AI campaigns that put your business in front of exactly the people who need it. No wasted reach, no guesswork.',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Create your account',
      text: 'Sign up free in under a minute. No credit card, no long forms.',
    },
    {
      number: '02',
      title: 'Log in',
      text: 'Come back anytime from your phone or laptop to manage everything.',
    },
    {
      number: '03',
      title: 'Set up your business',
      text: 'Tell us what you do, where you are, and what you offer. We do the rest.',
    },
    {
      number: '04',
      title: 'Get going',
      text: 'Your business goes live, gets found, and starts reaching the right customers.',
    },
  ];

  return (
    <section id="services" className="yp-services-section">
      <div className="yp-services-inner">

        {/* ── What we do ───────────────────────────────── */}
        <div className="yp-services-head">
          <span className="yp-services-eyebrow">What we do</span>
          <h2 className="yp-services-title">
            Everything your business needs to grow, in one place.
          </h2>
          <p className="yp-services-lead">
            Youpata brings systems, visibility and marketing together so you
            don't have to juggle ten different tools. Simple, affordable,
            built for small and medium businesses.
          </p>
        </div>

        <div className="yp-services-grid">
          {services.map((s) => (
            <article className="yp-services-card" key={s.title}>
              <h3 className="yp-services-card-title">{s.title}</h3>
              <p className="yp-services-card-text">{s.text}</p>
            </article>
          ))}
        </div>

        {/* ── Steps to get started ─────────────────────── */}
        <div className="yp-services-steps-head">
          <span className="yp-services-eyebrow">Get started</span>
          <h2 className="yp-services-title">
            Up and running in four simple steps.
          </h2>
          <p className="yp-services-lead">
            No setup fees, no tech skills needed. Just follow the steps and
            your business is on its way.
          </p>
        </div>

        <ol className="yp-services-steps">
          {steps.map((step) => (
            <li className="yp-services-step" key={step.number}>
              <span className="yp-services-step-number">{step.number}</span>
              <h3 className="yp-services-step-title">{step.title}</h3>
              <p className="yp-services-step-text">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="yp-services-cta">
          <Link to="/register" className="yp-services-btn">
            Create your free account
          </Link>
        </div>

      </div>
    </section>
  );
}

export default Services;