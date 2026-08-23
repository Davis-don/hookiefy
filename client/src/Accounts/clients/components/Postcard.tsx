// Postcard.tsx - with unique class names
import './postcard.css'
import { useState } from 'react';
import { FaUser, FaHeart, FaVenusMars, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import { toast } from 'sonner';
import 'bootstrap/dist/css/bootstrap.min.css'

interface PostcardProps {
  id: string;
  firstName: string;
  lastName: string;
  time: string;
  location: string;
  image: string | null;
  bio: string;
  profile_image_url?: string | null;
  preference?: {
    interested_in_gender: string;
    minimum_age: number;
    maximum_age: number;
  };
  gender?: string;
  email?: string;
  phone_number?: string;
  has_accepted?: boolean;
  sent_pending?: boolean;
  received_pending?: boolean;
}

// API calls remain the same...
const sendConnectionRequest = async (userId: string, accessToken: string | null): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/connections/hookup/${userId}/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to send connection request');
  }

  return response.json();
};

const acceptConnectionRequest = async (userId: string, accessToken: string | null): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/connections/accept/${userId}/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to accept connection request');
  }

  return response.json();
};

const rejectConnectionRequest = async (userId: string, accessToken: string | null): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/connections/reject/${userId}/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to reject connection request');
  }

  return response.json();
};

function Postcard({ 
  id,
  firstName, 
  lastName, 
  time, 
  location, 
  image, 
  bio,
  profile_image_url,
  preference,
  gender,
  has_accepted = false,
  sent_pending = false,
  received_pending = false,
}: PostcardProps) {
  const [showFullImage, setShowFullImage] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const { access: accessToken } = useAuthStore();

  const fullName = `${firstName} ${lastName}`;
  const avatarUrl = profile_image_url || null;

  const BIO_MAX_LENGTH = 120;
  const needsTruncation = bio && bio.length > BIO_MAX_LENGTH;
  const displayBio = needsTruncation && !bioExpanded 
    ? bio.slice(0, BIO_MAX_LENGTH) + '...' 
    : bio;

  console.log(`🖼️ Rendering Postcard for ${fullName}, Bio: "${bio}"`);
  console.log(`🔗 Connection status - Accepted: ${has_accepted}, Sent: ${sent_pending}, Received: ${received_pending}`);

  const connectionMutation = useMutation({
    mutationFn: () => sendConnectionRequest(id, accessToken),
    onSuccess: (data) => {
      toast.success(data.message || 'Connection request sent successfully!', {
        description: `You have connected with ${fullName}`,
        duration: 5000,
        icon: '🤝',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      console.log('Connection successful:', data);
    },
    onError: (error: Error) => {
      toast.error('Failed to send connection request', {
        description: error.message || 'Please try again later.',
        duration: 6000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      console.error('Connection error:', error);
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptConnectionRequest(id, accessToken),
    onSuccess: (data) => {
      toast.success(data.message || 'Connection accepted!', {
        description: `You are now connected with ${fullName}`,
        duration: 5000,
        icon: '🎉',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      console.log('Accept successful:', data);
    },
    onError: (error: Error) => {
      toast.error('Failed to accept connection', {
        description: error.message || 'Please try again later.',
        duration: 6000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      console.error('Accept error:', error);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectConnectionRequest(id, accessToken),
    onSuccess: (data) => {
      toast.success(data.message || 'Connection request rejected', {
        description: `You have rejected ${fullName}'s request`,
        duration: 5000,
        icon: '👋',
        style: {
          background: '#1a1a2e',
          border: '1px solid #f59e0b',
          color: '#ffffff',
        },
      });
      console.log('Reject successful:', data);
    },
    onError: (error: Error) => {
      toast.error('Failed to reject connection', {
        description: error.message || 'Please try again later.',
        duration: 6000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      console.error('Reject error:', error);
    },
  });

  const handleConnect = () => {
    console.log(`Connect request sent to ${fullName} (ID: ${id})`);
    
    const loadingToast = toast.loading('Sending connection request...', {
      description: `Connecting with ${fullName}`,
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    connectionMutation.mutate(undefined, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      }
    });
  };

  const handleAccept = () => {
    console.log(`Accepting connection from ${fullName} (ID: ${id})`);
    
    const loadingToast = toast.loading('Accepting connection...', {
      description: `Connecting with ${fullName}`,
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    acceptMutation.mutate(undefined, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      }
    });
  };

  const handleReject = () => {
    console.log(`Rejecting connection from ${fullName} (ID: ${id})`);
    
    const loadingToast = toast.loading('Rejecting connection...', {
      description: `Rejecting ${fullName}'s request`,
      style: {
        background: '#1a1a2e',
        border: '1px solid #f59e0b',
        color: '#ffffff',
      },
    });

    rejectMutation.mutate(undefined, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      }
    });
  };

  const handleImageClick = () => {
    if (image) {
      setShowFullImage(true);
    }
  };

  const handleCloseFullImage = () => {
    setShowFullImage(false);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const toggleBio = () => {
    setBioExpanded(!bioExpanded);
  };

  const toggleShowMore = () => {
    setShowMore(!showMore);
  };

  const getGenderDisplay = (gender?: string) => {
    if (!gender) return 'Not specified';
    const genderMap: { [key: string]: string } = {
      'M': 'Male',
      'F': 'Female',
      'male': 'Male',
      'female': 'Female',
      'other': 'Other'
    };
    return genderMap[gender] || gender;
  };

  const getInterestedInDisplay = (interested?: string) => {
    if (!interested) return 'Not specified';
    const genderMap: { [key: string]: string } = {
      'M': 'Men',
      'F': 'Women',
      'male': 'Men',
      'female': 'Women',
      'both': 'Both',
      'all': 'All'
    };
    return genderMap[interested] || interested;
  };

  const renderConnectionButton = () => {
    const isConnecting = connectionMutation.isPending;
    const isAccepting = acceptMutation.isPending;
    const isRejecting = rejectMutation.isPending;

    if (has_accepted) {
      return (
        <button className="pcard-connect-btn pcard-connected" disabled>
          ✓ Connected
        </button>
      );
    }

    if (sent_pending) {
      return (
        <button className="pcard-connect-btn pcard-pending" disabled>
          ⏳ Pending
        </button>
      );
    }

    if (received_pending) {
      return (
        <div className="pcard-connect-actions">
          <button 
            className="pcard-connect-btn pcard-accept" 
            onClick={handleAccept}
            disabled={isAccepting || isRejecting}
          >
            {isAccepting ? 'Accepting...' : '✓ Accept'}
          </button>
          <button 
            className="pcard-connect-btn pcard-reject" 
            onClick={handleReject}
            disabled={isAccepting || isRejecting}
          >
            {isRejecting ? 'Rejecting...' : '✕ Reject'}
          </button>
        </div>
      );
    }

    return (
      <button 
        className="pcard-connect-btn" 
        onClick={handleConnect}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
    );
  };

  return (
    <>
      <div className="pcard-container">
        {/* Post Header */}
        <div className="pcard-header">
          <div className="pcard-avatar-wrapper">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={fullName} 
                className="pcard-avatar-img" 
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement?.querySelector('.pcard-avatar-fallback')?.classList.add('show');
                }}
              />
            ) : null}
            <div className={`pcard-avatar-fallback ${!avatarUrl ? 'show' : ''}`}>
              <FaUser className="pcard-avatar-icon" />
            </div>
          </div>
          <div className="pcard-user-info">
            <div className="pcard-user-name">
              <h5 className='fs-3'>{fullName}</h5>
            </div>
            <div className="pcard-meta">
              <span className="pcard-time fs-6">{time}</span>
              <span className="pcard-dot fs-6">•</span>
              <span className="pcard-location fs-6">{location}</span>
            </div>
          </div>
        </div>

        {/* Post Image Section */}
        <div className="pcard-image-wrapper" onClick={handleImageClick}>
          {image ? (
            <>
              <div className={`pcard-image-loader ${imageLoaded ? 'hidden' : ''}`}>
                <div className="pcard-loader-spinner"></div>
              </div>
              <img 
                src={image} 
                alt={bio || `${fullName}'s profile`} 
                className={`pcard-image-content ${imageLoaded ? 'loaded' : ''}`}
                loading="lazy"
                onLoad={handleImageLoad}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    const fallback = parent.querySelector('.pcard-image-fallback');
                    if (fallback) {
                      fallback.classList.add('show');
                    }
                    const loader = parent.querySelector('.pcard-image-loader');
                    if (loader) {
                      loader.classList.add('hidden');
                    }
                  }
                }}
              />
              <div className="pcard-image-overlay">
                <span>Tap to view full</span>
              </div>
            </>
          ) : (
            <div className="pcard-image-fallback show">
              <FaUser className="pcard-image-icon" />
              <span className="pcard-image-fallback-text">No image available</span>
            </div>
          )}
        </div>

        {/* Post Bio */}
        <div className="pcard-caption">
          <span className="pcard-caption-text">{displayBio || 'No bio available'}</span>
          {needsTruncation && (
            <span className="pcard-caption-expand" onClick={toggleBio}>
              {bioExpanded ? ' less' : ' more'}
            </span>
          )}
        </div>

        {/* See More Details */}
        <div className="pcard-see-more">
          <span className="pcard-see-more-text" onClick={toggleShowMore}>
            {showMore ? (
              <>See less</>
            ) : (
              <>See more details</>
            )}
          </span>
        </div>

        {/* Additional Details */}
        {showMore && (
          <div className="pcard-details">
            <div className="pcard-details-grid">
              {gender && (
                <div className="pcard-detail-item">
                  <FaVenusMars className="pcard-detail-icon" />
                  <div className="pcard-detail-content">
                    <span className="pcard-detail-label">Gender</span>
                    <span className="pcard-detail-value">{getGenderDisplay(gender)}</span>
                  </div>
                </div>
              )}
              
              {preference?.interested_in_gender && (
                <div className="pcard-detail-item">
                  <FaHeart className="pcard-detail-icon" />
                  <div className="pcard-detail-content">
                    <span className="pcard-detail-label">Interested in</span>
                    <span className="pcard-detail-value">{getInterestedInDisplay(preference.interested_in_gender)}</span>
                  </div>
                </div>
              )}
              
              {(preference?.minimum_age || preference?.maximum_age) && (
                <div className="pcard-detail-item">
                  <FaCalendarAlt className="pcard-detail-icon" />
                  <div className="pcard-detail-content">
                    <span className="pcard-detail-label">Age preference</span>
                    <span className="pcard-detail-value">
                      {preference?.minimum_age || 'Any'} - {preference?.maximum_age || 'Any'}
                    </span>
                  </div>
                </div>
              )}
              
              {location && (
                <div className="pcard-detail-item">
                  <FaMapMarkerAlt className="pcard-detail-icon" />
                  <div className="pcard-detail-content">
                    <span className="pcard-detail-label">Location</span>
                    <span className="pcard-detail-value">{location}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connection Button Section */}
        <div className="pcard-connect-section">
          {renderConnectionButton()}
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {showFullImage && image && (
        <div className="pcard-full-modal" onClick={handleCloseFullImage}>
          <div className="pcard-full-container">
            <img 
              src={image} 
              alt={bio || `${fullName}'s profile`} 
              className="pcard-full-image"
              loading="eager"
            />
            <button className="pcard-full-close" onClick={handleCloseFullImage}>
              ✕
            </button>
            <div className="pcard-full-caption">
              <strong>{fullName}</strong> {bio || 'No bio available'}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Postcard;