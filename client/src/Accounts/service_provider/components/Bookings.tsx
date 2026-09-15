import './bookings.css'
const Bookings = () => {
  return (
    <div className="sp-page-container">
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Bookings</h1>
          <p className="sp-page-subtitle">View and manage your upcoming appointments.</p>
        </div>
      </div>

      <div className="sp-card">
        <p style={{ color: 'var(--sp-text-secondary)' }}>
          No bookings yet. Your upcoming appointments will appear here.
        </p>
      </div>
    </div>
  );
};

export default Bookings;