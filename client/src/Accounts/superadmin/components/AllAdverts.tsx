// components/adverts/AllAdverts.tsx
// All Adverts List Component with useQuery and Delete - Feed Style UI
// ============================================================

import './alladverts.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  FiImage,
  FiVideo,
  FiTrash2,
  FiAlertCircle,
  FiRefreshCw,
  FiCloud,
  FiLink,
  FiEye,
  FiLoader,
  FiPlay,
  FiExternalLink,
  FiX,
  FiClock
} from 'react-icons/fi';
import Loadingcomponent from '../../common/components/Loading/Loadingcomponent';

// ============================================================
// TYPES
// ============================================================

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

interface AdvertsResponse {
  message: string;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  data: Advert[];
}

// ============================================================
// API HELPERS
// ============================================================

const fetchAdverts = async (accessToken: string | null): Promise<Advert[]> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/adverts/?page=1&page_size=100`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch adverts');
  }

  const result: AdvertsResponse = await response.json();
  return result.data || [];
};

const deleteAdvert = async (
  advertId: string,
  accessToken: string | null
): Promise<{ message: string }> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/adverts/${advertId}/delete/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to delete advert');
  }

  return response.json();
};

// ============================================================
// HELPERS
// ============================================================

const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]+)/,
    /(?:youtu\.be\/)([\w-]+)/,
    /(?:youtube\.com\/embed\/)([\w-]+)/,
    /(?:youtube\.com\/v\/)([\w-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};


const isDirectVideo = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ============================================================
// DELETE CONFIRMATION MODAL
// ============================================================

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

const DeleteConfirmModal = ({ isOpen, title, onConfirm, onCancel, isDeleting }: DeleteConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="aa-modal-overlay" onClick={onCancel}>
      <div className="aa-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="aa-modal-close" onClick={onCancel}>
          <FiX />
        </button>
        <div className="aa-modal-icon-wrapper">
          <div className="aa-modal-icon">🗑️</div>
        </div>
        <h3 className="aa-modal-title">Delete Advert</h3>
        <p className="aa-modal-message">
          Are you sure you want to delete "<strong>{title}</strong>"? 
          <br />
          <span className="aa-modal-warning">This action cannot be undone.</span>
        </p>
        <div className="aa-modal-actions">
          <button className="aa-modal-cancel" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button className="aa-modal-confirm" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <FiLoader className="aa-spinning" /> Deleting...
              </>
            ) : (
              <>
                <FiTrash2 /> Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// LOADING SPINNER
// ============================================================

const LoadingSpinner = () => {
  return (
    <div className="aa-loading-container">
      <Loadingcomponent />
      <p className="aa-loading-text">Loading adverts...</p>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const AllAdverts = () => {
  const { access: accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({
    isOpen: false,
    id: '',
    title: ''
  });

  // ---- Fetch Adverts ----
  const {
    data: adverts,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<Advert[]>({
    queryKey: ['adverts'],
    queryFn: () => fetchAdverts(accessToken),
    enabled: !!accessToken,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // ---- Delete Mutation ----
  const deleteMutation = useMutation({
    mutationFn: (advertId: string) => deleteAdvert(advertId, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adverts'] });
      setDeleteModal({ isOpen: false, id: '', title: '' });
      
      toast.success('Advert deleted successfully!', {
        description: 'The advert has been removed from the system.',
        duration: 4000,
        icon: '🗑️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete advert', {
        description: error.message || 'Please try again.',
        duration: 5000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    },
  });

  // ---- Handle Delete ----
  const handleDeleteClick = (advertId: string, advertTitle: string) => {
    setDeleteModal({ isOpen: true, id: advertId, title: advertTitle });
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate(deleteModal.id);
  };

  const handleCancelDelete = () => {
    setDeleteModal({ isOpen: false, id: '', title: '' });
  };

  // ---- Render Media ----
  const renderMedia = (advert: Advert) => {
    if (advert.type === 'image') {
      return (
        <img
          src={advert.url}
          alt={advert.title}
          loading="lazy"
          className="aa-media-image"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            const placeholder = (e.target as HTMLImageElement)
              .parentElement?.querySelector('.aa-media-error-placeholder');
            if (placeholder) {
              (placeholder as HTMLElement).style.display = 'flex';
            }
          }}
        />
      );
    } else {
      const youtubeId = extractYouTubeId(advert.url);
      
      if (youtubeId) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={advert.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aa-media-video"
          />
        );
      }
      
      if (isDirectVideo(advert.url)) {
        return (
          <video
            src={advert.url}
            controls
            className="aa-media-video"
          />
        );
      }
      
      return (
        <div className="aa-media-error-placeholder">
          <FiPlay className="aa-media-placeholder-icon" />
          <span>Video not available</span>
          <button 
            className="aa-media-link-btn"
            onClick={() => window.open(advert.url, '_blank')}
          >
            <FiExternalLink /> Open Video
          </button>
        </div>
      );
    }
  };

  // ---- Get Source Badge ----
  const getSourceBadge = (publicId: string | null) => {
    if (publicId) {
      return {
        icon: <FiCloud />,
        label: 'Cloudinary',
        className: 'aa-source-cloudinary'
      };
    }
    return {
      icon: <FiLink />,
      label: 'External',
      className: 'aa-source-url'
    };
  };

  // ---- Loading State ----
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // ---- Error State ----
  if (isError) {
    return (
      <div className="aa-error-container">
        <FiAlertCircle className="aa-error-icon" />
        <p className="aa-error-text">
          {error instanceof Error ? error.message : 'Failed to load adverts'}
        </p>
        <button className="aa-retry-btn" onClick={() => refetch()}>
          <FiRefreshCw /> Retry
        </button>
      </div>
    );
  }

  // ---- Empty State ----
  if (!adverts || adverts.length === 0) {
    return (
      <div className="aa-empty-container">
        <div className="aa-empty-icon">📢</div>
        <h3>No Adverts Yet</h3>
        <p>Create your first advert by clicking the "Add Advert" tab above</p>
      </div>
    );
  }

  // ---- Render Adverts ----
  return (
    <>
      <div className="aa-all-adverts">
        {/* Header */}
        <div className="aa-list-header">
          <span className="aa-list-count">{adverts.length} advert{adverts.length !== 1 ? 's' : ''}</span>
          <button className="aa-refresh-btn" onClick={() => refetch()}>
            <FiRefreshCw /> Refresh
          </button>
        </div>

        {/* Adverts List - Feed Style */}
        <div className="aa-feed">
          {adverts.map((advert) => {
            const source = getSourceBadge(advert.public_id);
            
            return (
              <div key={advert.id} className="aa-feed-item">
                {/* Header with time and actions */}
                <div className="aa-feed-header">
                  <div className="aa-feed-meta">
                    <span className="aa-feed-time">
                      <FiClock /> {formatTime(advert.created_at)}
                    </span>
                    <span className="aa-feed-dot">•</span>
                    <span className="aa-feed-type">
                      {advert.type === 'image' ? <FiImage /> : <FiVideo />} {advert.type}
                    </span>
                  </div>
                  <div className="aa-feed-actions">
                    <button
                      className="aa-feed-action-btn aa-feed-view-btn"
                      onClick={() => window.open(advert.url, '_blank')}
                      title="View advert"
                    >
                      <FiEye />
                    </button>
                    <button
                      className="aa-feed-action-btn aa-feed-delete-btn"
                      onClick={() => handleDeleteClick(advert.id, advert.title)}
                      disabled={deleteMutation.isPending}
                      title="Delete advert"
                    >
                      {deleteMutation.isPending && deleteMutation.variables === advert.id ? (
                        <FiLoader className="aa-spinning" />
                      ) : (
                        <FiTrash2 />
                      )}
                    </button>
                  </div>
                </div>

                {/* Media - Full width */}
                <div className="aa-feed-media">
                  {renderMedia(advert)}
                </div>

                {/* Content */}
                <div className="aa-feed-content">
                  <h3 className="aa-feed-title">{advert.title}</h3>
                  
                  {advert.description && (
                    <p className="aa-feed-description">{advert.description}</p>
                  )}

                  {/* Footer with source badge */}
                  <div className="aa-feed-footer">
                    <span className={`aa-feed-source-badge ${source.className}`}>
                      {source.icon} {source.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="aa-list-footer">
          <span>Showing {adverts.length} advert{adverts.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
};

export default AllAdverts;