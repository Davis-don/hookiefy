import { useState } from 'react';
import './Fiq.css';

interface FaqItem {
  question: string;
  answer: string;
}

function Fiq(): React.JSX.Element {
  const faqs: FaqItem[] = [
    {
      question: 'How do I find a service provider near me?',
      answer:
        'Simply create an account, enter the service you need and your location. Youpata instantly shows you verified providers in your area — sorted by rating and distance.',
    },
    {
      question: 'How do I contact a provider?',
      answer:
        'Once you select a provider, you can send them a message with your request. When they respond, you receive their phone number and email so you can call and confirm availability directly.',
    },
    {
      question: 'Are the providers verified?',
      answer:
        'Yes. Every provider goes through an ID check and a review of their skills and past work before they can appear on Youpata, so you always know who you are dealing with.',
    },
    {
      question: 'What services can I find on Youpata?',
      answer:
        'You can find teachers, tutors, plumbers, electricians, carpenters, cleaners, hairstylists, delivery riders and many more skilled professionals — all in one place.',
    },
    {
      question: 'How do I become a service provider on Youpata?',
      answer:
        'Click "Become a Provider", fill in your details, upload a valid ID and list the services you offer. Once approved, you can start receiving requests from clients near you.',
    },
    {
      question: 'Is Youpata free to use?',
      answer:
        'Yes — Youpata is completely free to use. You can create an account, search for providers and connect with them at no cost. For extra benefits like priority listings, unlimited requests and premium support, we also offer Pro accounts.',
    },
  ];

  // null = all closed; number = index of the open item
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number): void => {
    setOpenIndex((prev) => (prev === i ? null : i));
  };

  return (
    <section className="fiq-section">
      <div className="fiq-header">
        <p className="fiq-eyebrow">Got Questions?</p>
        <h2 className="fiq-title">Frequently Asked Questions</h2>
        <p className="fiq-subtitle">Everything you need to know</p>
      </div>

      <div className="fiq-list">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              className={`fiq-item ${isOpen ? 'is-open' : ''}`}
              key={faq.question}
            >
              <button
                type="button"
                className="fiq-question"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                aria-controls={`fiq-answer-${i}`}
              >
                <span className="fiq-question-text">{faq.question}</span>
                <span className="fiq-icon" aria-hidden="true">
                  {isOpen ? '−' : '+'}
                </span>
              </button>

              <div
                className="fiq-answer-wrap"
                id={`fiq-answer-${i}`}
                role="region"
              >
                <p className="fiq-answer">{faq.answer}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default Fiq;