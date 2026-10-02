import './aboutus.css';

function Aboutus() {
  const points = [
    {
      title: 'AI that works for you',
      text: 'Smart systems put your business in front of exactly the people who need what you offer — no wasted reach, no guesswork.',
    },
    {
      title: 'Less busywork, more business',
      text: 'We handle the systems, reminders and follow-ups. You focus on serving your customers and growing.',
    },
    {
      title: 'Made for MSMEs',
      text: 'Youpata is built for small and medium businesses — the shops, salons, kiosks and services that keep the neighbourhood running.',
    },
    {
      title: 'Get seen, get found',
      text: 'From search to social, we help more people discover your business and choose you over the competition.',
    },
  ];

  return (
    <section id="how-it-works" className="yp-about-section">
      <div className="yp-about-inner">

        <div className="yp-about-text">
          <span className="yp-about-eyebrow">About Youpata</span>

          <h2 className="yp-about-title">
            We help small businesses stand out and grow.
          </h2>

          <p className="yp-about-lead">
            Running a business is hard. You wear every hat — owner, marketer,
            accountant, customer service. Youpata takes some of that weight
            off your shoulders so you can focus on what actually matters:
            your customers and your craft.
          </p>

          <p className="yp-about-lead">
            We use AI and simple tools to solve the everyday problems MSMEs
            face — getting found, getting hired, and getting paid. Whether
            you're a shop on the corner or a service growing across town,
            we help your business stand out and reach the people who need
            what you offer.
          </p>

          <ul className="yp-about-list">
            {points.map((p) => (
              <li key={p.title}>
                <span className="yp-about-dot" aria-hidden="true" />
                <div>
                  <strong>{p.title}.</strong> {p.text}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="yp-about-image">
          <img
            src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=1200&auto=format&fit=crop"
            alt="Small business owner working in her shop"
          />
        </div>

      </div>
    </section>
  );
}

export default Aboutus;