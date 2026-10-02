import './contactus.css';

function Contactus() {
  const contacts = [
    {
      label: 'Call us',
      value: '0758 420 860',
      href: 'tel:+254758420860',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07
                   19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1
                   4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0
                   1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0
                   1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
    },
    {
      label: 'Email us',
      value: 'davismugoikou@gmail.com',
      href: 'mailto:davismugoikou@gmail.com',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M2 6l10 7 10-7" />
        </svg>
      ),
    },
    {
      label: 'WhatsApp',
      value: '0758 420 860',
      href: 'https://wa.me/254758420860',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
          aria-hidden="true">
          <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15
                   -.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46
                   -2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61
                   .13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52
                   -.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01
                   c-.2 0-.52.07-.79.37-.27.3-1.03 1-1.03 2.44 0 1.44 1.05 2.83
                   1.2 3.03.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.67.62.7.22
                   1.34.19 1.85.12.56-.08 1.72-.7 1.96-1.38.24-.68.24-1.26.17
                   -1.38-.07-.12-.27-.19-.57-.34zM12.05 2C6.55 2 2.1 6.45 2.1 11.95
                   c0 1.76.46 3.41 1.27 4.85L2 22l5.35-1.4a9.9 9.9 0 0 0 4.7 1.2
                   c5.5 0 9.95-4.45 9.95-9.95S17.55 2 12.05 2zm0 18.2c-1.6 0-3.1
                   -.44-4.36-1.2l-.31-.18-3.17.83.85-3.1-.2-.32a8.2 8.2 0 0 1
                   -1.26-4.38c0-4.54 3.7-8.24 8.24-8.24s8.24 3.7 8.24 8.24-3.7
                   8.35-8.03 8.35z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="contact" className="yp-contact-section">
      <div className="yp-contact-inner">

        <div className="yp-contact-head">
          <span className="yp-contact-eyebrow">Contact Us</span>
          <h2 className="yp-contact-title">
            Let's talk about your business.
          </h2>
          <p className="yp-contact-lead">
            Questions, ideas, or ready to get started? Reach us any way
            that works for you — we reply fast.
          </p>
        </div>

        <div className="yp-contact-grid">
          {contacts.map((c) => (
            <a className="yp-contact-card" href={c.href} key={c.label}
              target={c.href.startsWith('http') ? '_blank' : undefined}
              rel={c.href.startsWith('http') ? 'noreferrer' : undefined}>
              <span className="yp-contact-icon">{c.icon}</span>
              <span className="yp-contact-label">{c.label}</span>
              <span className="yp-contact-value">{c.value}</span>
            </a>
          ))}
        </div>

      </div>
    </section>
  );
}

export default Contactus;