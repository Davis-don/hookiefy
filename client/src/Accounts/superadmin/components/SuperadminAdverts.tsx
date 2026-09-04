// components/SuperadminAdverts.tsx
// Super Admin Adverts Management Component
// ============================================================

import { useState, useEffect } from 'react';
import {  IoImageOutline, IoVideocamOutline} from 'react-icons/io5';
import { useAuthStore } from '../../../store/authtokenstore';
import './superadminadverts.css'


// Import sub-components
import AllAdverts from './AllAdverts';
import AddAdvert from './AddAdvert';

interface Advert {
  id: string;
  title: string;
  description: string | null;
  url: string;
  type: 'image' | 'video';
  public_id: string | null;
  created_at: string;
  updated_at: string;
}

type TabType = 'all' | 'add';

const SuperadminAdverts = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { access: accessToken } = useAuthStore();

  // Fetch adverts
  useEffect(() => {
    if (activeTab === 'all') {
      fetchAdverts();
    }
  }, [activeTab]);

  const fetchAdverts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/adverts/?page=1&page_size=100', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch adverts');
      }

      const data = await response.json();
      setAdverts(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching adverts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle advert created/updated
  const handleAdvertChange = () => {
    fetchAdverts();
    setActiveTab('all');
  };

  // Get type badge class
  const getTypeBadgeClass = (type: string) => {
    return type === 'image' ? 'image' : 'video';
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    return type === 'image' ? <IoImageOutline /> : <IoVideocamOutline />;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Delete advert
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this advert?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/adverts/${id}/delete/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete advert');
      }

      // Remove from local state
      setAdverts(adverts.filter(advert => advert.id !== id));
    } catch (err) {
      console.error('Error deleting advert:', err);
      alert('Failed to delete advert. Please try again.');
    }
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
          {adverts.length > 0 && (
            <span className="tab-badge">{adverts.length}</span>
          )}
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
          <AllAdverts 
            adverts={adverts}
            isLoading={isLoading}
            error={error}
            onDelete={handleDelete}
            onRetry={fetchAdverts}
            getTypeBadgeClass={getTypeBadgeClass}
            getTypeIcon={getTypeIcon}
            formatDate={formatDate}
          />
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