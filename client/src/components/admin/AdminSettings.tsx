import './newadminsettings.css'
import { IoMdAdd } from "react-icons/io";
import { MdAdminPanelSettings } from "react-icons/md";
import 'bootstrap/dist/css/bootstrap.min.css';
import AddAdminSettings from './AddAdminSettings';
import { useState } from 'react';

function AdminSettings() {
  const [showAddConfig, setShowAddConfig] = useState(true);

  return (
    <div className="overall-admin-settings-container">
      <div className="admin-settings-header-section">
        <div className="left-side-admin-settings-header">
          <div className="header-icon-wrapper">
            <MdAdminPanelSettings className="header-main-icon" />
          </div>
          <div className="header-text-content">
            <h2>Admin Settings</h2>
            <p>Configure settings for your clients ❤️</p>
          </div>
        </div>
        <div className="right-side-admin-settings-header">
          <button 
            onClick={() => setShowAddConfig(true)} 
            className={`btn-romantic ${showAddConfig ? 'active' : ''}`}
          >
            <IoMdAdd /> Add Configuration
          </button>
        </div>
      </div>

      <div className="render-admin-settings-data-container">
        <AddAdminSettings />
      </div>
    </div>
  );
}

export default AdminSettings;