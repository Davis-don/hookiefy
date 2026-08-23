// components/AdminSettings.tsx
// ============================================================
// AdminSettings.tsx - Admin Settings Page
// ============================================================

import React from 'react';
import './AdminSettings.css';

const AdminSettings: React.FC = () => {
  return (
    <div className="admin-settings-container">
      <div className="admin-settings-header">
        <h2>Settings</h2>
        <p className="admin-settings-subtitle">Manage your admin preferences</p>
      </div>

      <div className="admin-settings-card">
        <div className="admin-settings-section">
          <h4>General Settings</h4>
          <div className="admin-settings-item">
            <label>Language</label>
            <select className="admin-settings-select">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>
          <div className="admin-settings-item">
            <label>Timezone</label>
            <select className="admin-settings-select">
              <option value="utc">UTC</option>
              <option value="est">EST</option>
              <option value="pst">PST</option>
            </select>
          </div>
        </div>

        <div className="admin-settings-section">
          <h4>Notifications</h4>
          <div className="admin-settings-item">
            <label>Email Notifications</label>
            <div className="admin-settings-toggle">
              <input type="checkbox" defaultChecked />
              <span className="admin-settings-toggle-slider"></span>
            </div>
          </div>
          <div className="admin-settings-item">
            <label>Push Notifications</label>
            <div className="admin-settings-toggle">
              <input type="checkbox" />
              <span className="admin-settings-toggle-slider"></span>
            </div>
          </div>
        </div>

        <div className="admin-settings-section">
          <h4>Security</h4>
          <div className="admin-settings-item">
            <label>Two-Factor Authentication</label>
            <button className="admin-settings-btn">Enable</button>
          </div>
          <div className="admin-settings-item">
            <label>Change Password</label>
            <button className="admin-settings-btn">Update</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;