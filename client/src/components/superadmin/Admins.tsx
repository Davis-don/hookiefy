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
      {/* Floating decorative elements */}
      <div className="hookey-admins-floating-hearts">
        <span>❤️</span>
        <span>💖</span>
        <span>💗</span>
        <span>💕</span>
        <span>💓</span>
      </div>
      
      <div className="hookey-admins-header">
        <h2 className="hookey-admins-title">
          <span className="hookey-admins-title-text">Administrators</span>
          <span className="hookey-admins-title-crown">👑</span>
        </h2>
        <p className="hookey-admins-subtitle">Manage your royal team with love ✨</p>
      </div>
      
      {/* Modern toggle buttons */}
      <div className="hookey-admins-toggle-container">
        <button 
          className={`hookey-admins-toggle-btn ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          <span className="hookey-admins-toggle-icon">+</span>
          <span className="hookey-admins-toggle-text">Add New</span>
          {activeTab === 'add' && <span className="hookey-admins-toggle-glow"></span>}
        </button>
        
        <button 
          className={`hookey-admins-toggle-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span className="hookey-admins-toggle-icon">👥</span>
          <span className="hookey-admins-toggle-text">All Admins</span>
          {activeTab === 'all' && <span className="hookey-admins-toggle-glow"></span>}
        </button>
        
        {/* Decorative line */}
        <div className="hookey-admins-toggle-decoration">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      
      {/* Content Area with glass morphism */}
      <div className="hookey-admins-content-wrapper">
        <div className="hookey-admins-content">
          {renderContent()}
        </div>
      </div>
      
      {/* Romantic corner decorations */}
      <div className="hookey-admins-corner top-left">🌹</div>
      <div className="hookey-admins-corner top-right">💐</div>
      <div className="hookey-admins-corner bottom-left">🌸</div>
      <div className="hookey-admins-corner bottom-right">🌺</div>
    </div>
  );
};

export default Admins;