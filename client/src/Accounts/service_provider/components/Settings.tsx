import './settings.css'

const Settings = () => {
  return (
    <div className="sp-page-container">
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Settings</h1>
          <p className="sp-page-subtitle">Configure your account preferences.</p>
        </div>
      </div>

      <div className="sp-card">
        <h3 style={{ marginBottom: '16px' }}>Account Settings</h3>
        <p style={{ color: 'var(--sp-text-secondary)' }}>
          Manage notifications, privacy, and account preferences here.
        </p>
      </div>
    </div>
  );
};

export default Settings;