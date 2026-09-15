import './home.css'

const Home = () => {
  return (
    <div className="sp-page-container">
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Welcome back! 👋</h1>
          <p className="sp-page-subtitle">Here's what's happening with your services today.</p>
        </div>
      </div>

      <div className="sp-grid">
        <div className="sp-card">
          <h3>Today's Bookings</h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--sp-primary)' }}>8</p>
          <p style={{ color: 'var(--sp-text-secondary)', fontSize: '0.875rem' }}>+2 from yesterday</p>
        </div>
        <div className="sp-card">
          <h3>Total Earnings</h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--sp-success)' }}>$1,240</p>
          <p style={{ color: 'var(--sp-text-secondary)', fontSize: '0.875rem' }}>This week</p>
        </div>
        <div className="sp-card">
          <h3>Active Services</h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--sp-accent)' }}>12</p>
          <p style={{ color: 'var(--sp-text-secondary)', fontSize: '0.875rem' }}>Listed services</p>
        </div>
        <div className="sp-card">
          <h3>Rating</h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--sp-warning)' }}>4.8 ⭐</p>
          <p style={{ color: 'var(--sp-text-secondary)', fontSize: '0.875rem' }}>From 156 reviews</p>
        </div>
      </div>
    </div>
  );
};

export default Home;