import React, { useState } from 'react';
import './admins.css';
import AddAdmin from './AddAdmin';
import AllAdmins from './AllAdmins';

// Types
type AdminTab = 'add' | 'all';

// Main Admins Component
const Admins: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('add');

  const renderContent = (): React.ReactNode => {
    switch (activeTab) {
      case 'add':
        return <AddAdmin />;
      case 'all':
        return <AllAdmins />;
      default:
        return <AddAdmin />;
    }
  };

  return (
    <div className="hookey-superadmin-admins-overall-container">
      <h2>Admins</h2>
      
      <div className="navigation-admins-admin-section">
        <ul>
          <li 
            className={activeTab === 'add' ? 'active' : ''}
            onClick={() => setActiveTab('add')}
          >
            Add Admin
          </li>
          <li 
            className={activeTab === 'all' ? 'active' : ''}
            onClick={() => setActiveTab('all')}
          >
            All Admins
          </li>
        </ul>
      </div>
      
      <div className="hookey-superadmin-admins-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Admins;