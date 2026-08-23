// components/AdminProfile.tsx
// ============================================================
// AdminProfile.tsx - Admin Profile Page
// ============================================================

import React, { useState } from 'react';
import './AdminProfile.css';

const AdminProfile: React.FC = () => {
  const [profileData, setProfileData] = useState({
    name: 'Admin User',
    email: 'admin@hookiefy.com',
    role: 'Super Admin',
    phone: '+1 (555) 123-4567',
    bio: 'Platform Administrator',
    joined: 'January 2024',
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    // Here you would save the data
  };

  return (
    <div className="admin-profile-container">
      <div className="admin-profile-header">
        <h2>Admin Profile</h2>
        <p className="admin-profile-subtitle">Manage your account settings</p>
      </div>

      <div className="admin-profile-card">
        <div className="admin-profile-avatar-section">
          <div className="admin-profile-avatar-large">
            <span className="admin-profile-avatar-letter">
              {profileData.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="admin-profile-info">
            <h3>{profileData.name}</h3>
            <span className="admin-profile-role">{profileData.role}</span>
            <span className="admin-profile-joined">Joined {profileData.joined}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="admin-profile-form">
          <div className="admin-form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={profileData.name}
              onChange={handleChange}
              disabled={!isEditing}
              className="admin-form-input"
            />
          </div>

          <div className="admin-form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={profileData.email}
              onChange={handleChange}
              disabled={!isEditing}
              className="admin-form-input"
            />
          </div>

          <div className="admin-form-group">
            <label>Phone</label>
            <input
              type="tel"
              name="phone"
              value={profileData.phone}
              onChange={handleChange}
              disabled={!isEditing}
              className="admin-form-input"
            />
          </div>

          <div className="admin-form-group">
            <label>Bio</label>
            <textarea
              name="bio"
              value={profileData.bio}
              onChange={handleChange}
              disabled={!isEditing}
              className="admin-form-textarea"
              rows={3}
            />
          </div>

          <div className="admin-form-actions">
            {!isEditing ? (
              <button 
                type="button" 
                onClick={() => setIsEditing(true)}
                className="admin-btn admin-btn-edit"
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button 
                  type="submit" 
                  className="admin-btn admin-btn-save"
                >
                  Save Changes
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="admin-btn admin-btn-cancel"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminProfile;