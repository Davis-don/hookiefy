import { useState } from 'react';
import './Fiqs.css';

function Fiqs() {
  const faqs = [
    {
      q: 'What is Youpata?',
      a: 'Youpata is a growth platform built for small and medium businesses. We give you the systems, visibility and AI-powered marketing you need to get found, get hired, and grow — all in one place.',
    },
    {
      q: 'Who is Youpata for?',
      a: 'Any small or medium business owner — shops, salons, kiosks, tutors, plumbers, cleaners, tailors, restaurants and more. If you run a business and want more customers, Youpata is built for you.',
    },
    {
      q: 'How does the AI help my business?',
      a: 'Our smart systems put your business in front of exactly the people who need what you offer. No wasted reach, no guesswork — just the right customers seeing you at the right time.',
    },
    {
      q: 'Do I need technical skills to use it?',
      a: 'Not at all. If you can use WhatsApp, you can use Youpata. Everything is designed to be simple, clear and quick to set up.',
    },
    {
      q: 'How much does it cost?',
      a: 'You can create your account for free — no credit card needed. Paid plans come later if you want more reach and features, but you can start growing today without paying anything.',
    },
    {
      q: 'How do I get started?',
      a: 'Just create a free account, log in, tell us about your business, and you are live. The whole setup takes a few minutes.',
    },
    {
      q: 'Can I reach a real person if I need help?',
      a: 'Yes. Call or WhatsApp us on 0758 420 860, or email davismugoikou@gmail.com. We reply fast.',
    },
  ];

  const [open, setOpen] = useState<number | null>(0);

  const toggle = (i: number) => {
    setOpen((prev) => (prev === i ? null : i));
  };

  return (
    <section id="faq" className="yp-faq-section">
      <div className="yp-faq-inner">

        <div className="yp-faq-head">
          <span className="yp-faq-eyebrow">FAQs</span>
          <h2 className="yp-faq-title">Questions? We've got answers.</h2>
          <p className="yp-faq-lead">
            Everything you need to know about Youpata. Still curious?
            Reach us anytime — we're happy to help.
          </p>
        </div>

        <ul className="yp-faq-list">
          {faqs.map((item, i) => {
            const isOpen = open === i;
            return (
              <li
                className={`yp-faq-item ${isOpen ? 'is-open' : ''}`}
                key={item.q}
              >
                <button
                  type="button"
                  className="yp-faq-question"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <span className="yp-faq-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.4"
                      strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                </button>
                <div className="yp-faq-answer">
                  <p>{item.a}</p>
                </div>
              </li>
            );
          })}
        </ul>

      </div>
    </section>
  );
}

export default Fiqs;