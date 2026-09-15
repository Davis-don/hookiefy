import './analytics.css'

const Analytics = () => {
  return (
    <div className="sp-page-container">
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Analytics</h1>
          <p className="sp-page-subtitle">Track your performance and growth.</p>
        </div>
      </div>

      <div className="sp-grid">
        <div className="sp-card">
          <h3>Views</h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--sp-primary)' }}>1,234</p>
        </div>
        <div className="sp-card">
          <h3>Conversion Rate</h3>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--sp-success)' }}>12.5%</p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;