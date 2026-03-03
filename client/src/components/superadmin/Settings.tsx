import React, { useState } from 'react';
import './superadminsettings.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Accountssettings from './Accountssettings';
import Adminssupersettings from './Adminssupersettings';
import Billingssupersettings from './Billingssupersettings';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('account');

  const renderContent = () => {
    switch(activeTab) {
      case 'account':
        return <Accountssettings />;
      case 'admins':
        return <Adminssupersettings />;
      case 'billing':
        return <Billingssupersettings />;
      default:
        return <Accountssettings />;
    }
  };

  return (
    <div className="overall-superadmin-settings-container">
      <div className="superadmin-header-settings">
        <div className="header-intro-superadmin-settings">
          <h2>Settings & Configurations</h2>
          <p>Manage your accounts settings and preferences with love ❤️</p>
        </div>
        <div className="settings_navigations-contrainer-superadmin">
          <ul>
            <li 
              className={activeTab === 'account' ? 'active' : ''}
              onClick={() => setActiveTab('account')}
            >
              Account
            </li>
            <li 
              className={activeTab === 'admins' ? 'active' : ''}
              onClick={() => setActiveTab('admins')}
            >
              Admins
            </li>
            <li 
              className={activeTab === 'billing' ? 'active' : ''}
              onClick={() => setActiveTab('billing')}
            >
              Billing
            </li>
          </ul>
        </div>
      </div>

      <div className="settings_body_render_superadmin">
        {renderContent()}
      </div>
    </div>
  );
};

export default Settings;