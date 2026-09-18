// SeekerSettings.tsx
import { FiSettings } from 'react-icons/fi';
import './seekersettings.css';

const SeekerSettings = () => {
  return (
    <div className="ss-settings-page">
      <div className="ss-settings-header">
        <div>
          <h1 className="ss-settings-title">Settings</h1>
          <p className="ss-settings-subtitle">
            Manage your account preferences.
          </p>
        </div>
      </div>

      <div className="ss-settings-empty">
        <FiSettings className="ss-settings-empty-icon" />
        <h3 className="ss-settings-empty-title">
          Settings coming soon
        </h3>
        <p className="ss-settings-empty-text">
          Notification preferences, privacy controls, and
          more will live here.
        </p>
      </div>
    </div>
  );
};

export default SeekerSettings;