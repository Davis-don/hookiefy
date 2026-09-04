// components/SuperadminAdverts.tsx
// Super Admin Adverts Management Component
// ============================================================

import { useState } from 'react';
import './superadminadverts.css';

// Import sub-components
import AllAdverts from './AllAdverts';
import AddAdvert from './AddAdvert';

type TabType = 'all' | 'add';

const SuperadminAdverts = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Handle advert created/updated - switch back to all view
  const handleAdvertChange = () => {
    setActiveTab('all');
  };

  return (
    <div className="adverts-container">
      {/* Header with Tabs */}
      <div className="adverts-header">
        <div className="adverts-title-section">
          <h1>📢 Adverts Management</h1>
          <p>Manage all adverts (images and videos) in the system</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="adverts-tabs">
        <button 
          className={`adverts-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span className="tab-icon">📋</span>
          All Adverts
        </button>
        <button 
          className={`adverts-tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          <span className="tab-icon">➕</span>
          Add Advert
        </button>
      </div>

      {/* Tab Content */}
      <div className="adverts-tab-content">
        {activeTab === 'all' ? (
          <AllAdverts />
        ) : (
          <AddAdvert 
            onSuccess={handleAdvertChange}
            onCancel={() => setActiveTab('all')}
          />
        )}
      </div>
    </div>
  );
};

export default SuperadminAdverts;