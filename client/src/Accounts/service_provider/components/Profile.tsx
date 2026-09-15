import './profile.css'

const Profile = () => {
  return (
    <div className="sp-page-container">
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Profile</h1>
          <p className="sp-page-subtitle">Manage your personal information.</p>
        </div>
      </div>

      <div className="sp-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div
            className="sp-user-avatar"
            style={{ width: '80px', height: '80px', fontSize: '1.5rem' }}
          >
            SP
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Service Provider</h2>
            <p style={{ color: 'var(--sp-text-secondary)', fontSize: '0.875rem' }}>
              provider@servicehub.com
            </p>
          </div>
        </div>
        <p style={{ color: 'var(--sp-text-secondary)' }}>
          Profile details will appear here. Update your information to help customers find you.
        </p>
      </div>
    </div>
  );
};

export default Profile;