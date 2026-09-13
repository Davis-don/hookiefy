import './ninche.css';

function Ninche() {
  const categories = [
    {
      name: 'Home Repair',
      icon: '🔧',
      tagline: 'Fix it fast, fix it right',
      description: 'Plumbers, electricians, carpenters and handymen for every household fix.',
      stat: '2,500+ Pros',
      badge: 'Most Booked',
    },
    {
      name: 'Tutoring',
      icon: '📚',
      tagline: 'Learn from the best',
      description: 'Qualified teachers and tutors for primary, high school and college subjects.',
      stat: '1,200+ Tutors',
      badge: 'Top Rated',
    },
    {
      name: 'Cleaning',
      icon: '🧹',
      tagline: 'Spotless every time',
      description: 'Home, office and deep-cleaning services from vetted professionals.',
      stat: '900+ Cleaners',
      badge: 'Best Value',
    },
    {
      name: 'Beauty & Wellness',
      icon: '💇',
      tagline: 'Look good, feel great',
      description: 'Hair stylists, barbers, manicurists and personal care experts near you.',
      stat: '700+ Stylists',
      badge: 'Trending',
    },
    {
      name: 'Delivery & Errands',
      icon: '🛵',
      tagline: 'Skip the hustle',
      description: 'Send packages, run errands or get anything delivered around town.',
      stat: '1,500+ Runners',
      badge: 'Fast & Reliable',
    },
  ];

  return (
    <section className="ninche-section">
      <div className="ninche-header">
        <p className="ninche-eyebrow">Services You Can Trust</p>
        <h2 className="ninche-title">Choose Your Service</h2>
        <p className="ninche-subtitle">
          The right pro for every job. Get things done, your way with Youpata.
        </p>
      </div>

      <div className="ninche-grid">
        {categories.map((cat) => (
          <article className="ninche-card" key={cat.name}>
            <div className="ninche-card-top">
              <span className="ninche-icon" aria-hidden="true">
                {cat.icon}
              </span>
              <span className="ninche-badge">{cat.badge}</span>
            </div>

            <h3 className="ninche-name">{cat.name}</h3>
            <p className="ninche-tagline">{cat.tagline}</p>
            <p className="ninche-desc">{cat.description}</p>

            <div className="ninche-card-footer">
              <div className="ninche-stat">
                <span className="ninche-stat-dot" />
                {cat.stat}
              </div>

              <button type="button" className="ninche-btn" aria-label={`Book ${cat.name}`}>
                Book
                <span className="ninche-btn-arrow">→</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Ninche;