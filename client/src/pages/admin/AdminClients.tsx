import React, { useState } from 'react';
import './adminclients.css';
import AllClients from './AllClients';
import AddClient from './AddClient';

// Types
type ClientsTab = 'all' | 'add';

const AdminClients: React.FC = () => {
  const [activeClientTab, setActiveClientTab] = useState<ClientsTab>('all');

  const renderClientContent = (): React.ReactNode => {
    switch (activeClientTab) {
      case 'all':
        return <AllClients />;
      case 'add':
        return <AddClient />;
      default:
        return <AllClients />;
    }
  };

  return (
    <div className="hookey-admin-clients-romantic-wrapper">
      {/* Floating romantic elements */}
      <div className="hookey-clients-floating-romance">
        <span>💕</span>
        <span>💖</span>
        <span>💗</span>
        <span>💓</span>
        <span>💘</span>
        <span>💝</span>
      </div>
      
      {/* Header Section */}
      <div className="hookey-clients-header-section">
        <h1 className="hookey-clients-main-title">
          <span className="hookey-clients-title-text">Beloved Clients</span>
          <span className="hookey-clients-title-heart">💑</span>
        </h1>
        <p className="hookey-clients-romantic-subtitle">Nurturing relationships with love and care ✨</p>
      </div>
      
      {/* Modern toggle buttons for clients */}
      <div className="hookey-clients-toggle-love-container">
        <button 
          className={`hookey-clients-love-toggle ${activeClientTab === 'all' ? 'active-love' : ''}`}
          onClick={() => setActiveClientTab('all')}
        >
          <span className="hookey-clients-toggle-emoji">👥</span>
          <span className="hookey-clients-toggle-label">All Clients</span>
          {activeClientTab === 'all' && <span className="hookey-clients-toggle-aura"></span>}
        </button>
        
        <button 
          className={`hookey-clients-love-toggle ${activeClientTab === 'add' ? 'active-love' : ''}`}
          onClick={() => setActiveClientTab('add')}
        >
          <span className="hookey-clients-toggle-emoji">➕</span>
          <span className="hookey-clients-toggle-label">Add Client</span>
          {activeClientTab === 'add' && <span className="hookey-clients-toggle-aura"></span>}
        </button>
        
        {/* Decorative hearts */}
        <div className="hookey-clients-toggle-hearts">
          <span>❤️</span>
          <span>❤️</span>
          <span>❤️</span>
        </div>
      </div>
      
      {/* Content Area with romantic glass effect */}
      <div className="hookey-clients-romantic-content-box">
        <div className="hookey-clients-content-innermost">
          {renderClientContent()}
        </div>
      </div>
      
      {/* Corner love decorations */}
      <div className="hookey-clients-corner-love top-left-love">🌷</div>
      <div className="hookey-clients-corner-love top-right-love">🌹</div>
      <div className="hookey-clients-corner-love bottom-left-love">🌸</div>
      <div className="hookey-clients-corner-love bottom-right-love">🌺</div>
    </div>
  );
};

export default AdminClients;