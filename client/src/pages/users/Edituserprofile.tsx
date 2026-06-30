// ============================================================
// Edituserprofile.tsx  (Instagram-style profile edit - scrollable)
// ============================================================

import Generalinfoedit from "../superadmin/Generalinfoedit";
import Passwordedit from "../superadmin/Passwordedit";
import Dangerzone from "../superadmin/Dangerzone";
import Myuserpreference from "./Myuserpreference";
import Myuserprofile from "./Myuserprofile";
import { FiUser, FiLock, FiHeart, FiEdit2, FiAlertTriangle } from 'react-icons/fi';
import './Edituserprofile.css';

function Edituserprofile() {
  return (
    <div className="overall-edit-user-profile-container">
      {/* Profile Section */}
      <div className="edit-section">
        <div className="edit-section-header">
          <div className="edit-section-icon-wrapper">
            <FiUser className="edit-section-icon" />
          </div>
          <div className="edit-section-title-wrapper">
            <h3 className="edit-section-title">Profile</h3>
            <p className="edit-section-subtitle">Update your bio, location, and personal details</p>
          </div>
        </div>
        <div className="edit-section-content">
          <Myuserprofile />
        </div>
      </div>

      {/* General Info Section */}
      <div className="edit-section">
        <div className="edit-section-header">
          <div className="edit-section-icon-wrapper">
            <FiEdit2 className="edit-section-icon" />
          </div>
          <div className="edit-section-title-wrapper">
            <h3 className="edit-section-title">General Info</h3>
            <p className="edit-section-subtitle">Edit your name, email, and phone number</p>
          </div>
        </div>
        <div className="edit-section-content">
          <Generalinfoedit />
        </div>
      </div>

      {/* Preferences Section */}
      <div className="edit-section">
        <div className="edit-section-header">
          <div className="edit-section-icon-wrapper">
            <FiHeart className="edit-section-icon" />
          </div>
          <div className="edit-section-title-wrapper">
            <h3 className="edit-section-title">Preferences</h3>
            <p className="edit-section-subtitle">Set your matching preferences</p>
          </div>
        </div>
        <div className="edit-section-content">
          <Myuserpreference />
        </div>
      </div>

      {/* Password Section */}
      <div className="edit-section">
        <div className="edit-section-header">
          <div className="edit-section-icon-wrapper">
            <FiLock className="edit-section-icon" />
          </div>
          <div className="edit-section-title-wrapper">
            <h3 className="edit-section-title">Password</h3>
            <p className="edit-section-subtitle">Change your account password</p>
          </div>
        </div>
        <div className="edit-section-content">
          <Passwordedit />
        </div>
      </div>

      {/* Danger Zone Section */}
      <div className="edit-section edit-section-danger">
        <div className="edit-section-header">
          <div className="edit-section-icon-wrapper danger">
            <FiAlertTriangle className="edit-section-icon" />
          </div>
          <div className="edit-section-title-wrapper">
            <h3 className="edit-section-title danger">Danger Zone</h3>
            <p className="edit-section-subtitle">Delete your account permanently</p>
          </div>
        </div>
        <div className="edit-section-content">
          <Dangerzone />
        </div>
      </div>
    </div>
  );
}

export default Edituserprofile;