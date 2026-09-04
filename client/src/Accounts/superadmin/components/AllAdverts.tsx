// components/adverts/AllAdverts.tsx
// All Adverts List Component with useQuery and Delete
// ============================================================

import './alladverts.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import { toast } from 'sonner';
import {
  FiImage,
  FiVideo,
  FiTrash2,
  FiAlertCircle,
  FiRefreshCw,
  FiCloud,
  FiLink,
  FiCalendar,
  FiEye,
  FiLoader,
  FiPlay,
  FiYoutube,
  FiExternalLink
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

const isYouTubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

const isDirectVideo = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
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
  const handleDelete = (advertId: string, advertTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${advertTitle}"?`)) {
      return;
    }
    deleteMutation.mutate(advertId);
  };

  // ---- Format Date ----
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // ---- Get Type Badge Class ----
  const getTypeBadgeClass = (type: string) => {
    return type === 'image' ? 'aa-type-image' : 'aa-type-video';
  };

  // ---- Get Type Icon ----
  const getTypeIcon = (type: string) => {
    return type === 'image' ? <FiImage /> : <FiVideo />;
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
      label: 'External URL',
      className: 'aa-source-url'
    };
  };

  // ---- Render Video ----
  const renderVideo = (url: string, title: string) => {
    const youtubeId = extractYouTubeId(url);
    
    if (youtubeId) {
      // YouTube embed
      return (
        <div className="aa-video-wrapper">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aa-video-iframe"
          />
          <div className="aa-video-platform-badge youtube">
            <FiYoutube /> YouTube
          </div>
        </div>
      );
    }
    
    if (isDirectVideo(url)) {
      // Direct video file
      return (
        <div className="aa-video-wrapper">
          <video
            src={url}
            controls
            className="aa-video-element"
            poster=""
          />
          <div className="aa-video-platform-badge direct">
            <FiVideo /> Direct Video
          </div>
        </div>
      );
    }
    
    // Generic video link with play button overlay
    return (
      <div className="aa-video-wrapper">
        <div className="aa-video-placeholder">
          <FiPlay className="aa-video-placeholder-icon" />
          <span className="aa-video-placeholder-text">Video</span>
          <button 
            className="aa-video-link-btn"
            onClick={() => window.open(url, '_blank')}
          >
            <FiExternalLink /> Watch Video
          </button>
        </div>
        <div className="aa-video-platform-badge external">
          <FiLink /> External Video
        </div>
      </div>
    );
  };

  // ---- Render Image ----
  const renderImage = (url: string, title: string) => {
    return (
      <img
        src={url}
        alt={title}
        loading="lazy"
        className="aa-image-element"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          const placeholder = (e.target as HTMLImageElement)
            .parentElement?.querySelector('.aa-media-placeholder');
          if (placeholder) {
            (placeholder as HTMLElement).style.display = 'flex';
          }
        }}
      />
    );
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
    <div className="aa-all-adverts">
      {/* Header with count */}
      <div className="aa-list-header">
        <div className="aa-list-header-left">
          <span className="aa-list-count">{adverts.length} advert{adverts.length !== 1 ? 's' : ''}</span>
        </div>
        <button className="aa-refresh-btn" onClick={() => refetch()}>
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* Adverts Grid */}
      <div className="aa-grid">
        {adverts.map((advert) => {
          const source = getSourceBadge(advert.public_id);
          const isYoutube = isYouTubeUrl(advert.url);
          
          return (
            <div key={advert.id} className="aa-card">
              {/* Media */}
              <div className="aa-card-media">
                {advert.type === 'image' ? (
                  renderImage(advert.url, advert.title)
                ) : (
                  renderVideo(advert.url, advert.title)
                )}
                <div className="aa-media-placeholder" style={{ display: 'none' }}>
                  {getTypeIcon(advert.type)}
                </div>
                
                {/* Type badge overlay */}
                <span className={`aa-media-type-badge ${getTypeBadgeClass(advert.type)}`}>
                  {getTypeIcon(advert.type)} {advert.type}
                  {isYoutube && advert.type === 'video' && ' (YouTube)'}
                </span>
              </div>

              {/* Body */}
              <div className="aa-card-body">
                <h3 className="aa-card-title" title={advert.title}>
                  {advert.title}
                </h3>
                
                {advert.description && (
                  <p className="aa-card-description" title={advert.description}>
                    {advert.description}
                  </p>
                )}

                <div className="aa-card-footer">
                  <div className="aa-card-footer-left">
                    {/* Source badge */}
                    <span className={`aa-source-badge ${source.className}`}>
                      {source.icon} {source.label}
                    </span>
                    
                    {/* Date */}
                    <span className="aa-card-date">
                      <FiCalendar /> {formatDate(advert.created_at)}
                    </span>
                  </div>

                  <div className="aa-card-actions">
                    {/* View button */}
                    <button
                      className="aa-action-btn aa-view-btn"
                      onClick={() => window.open(advert.url, '_blank')}
                      title="View advert"
                    >
                      <FiEye />
                    </button>
                    
                    {/* Delete button */}
                    <button
                      className="aa-action-btn aa-delete-btn"
                      onClick={() => handleDelete(advert.id, advert.title)}
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
  );
};

export default AllAdverts;