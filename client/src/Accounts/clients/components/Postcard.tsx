import './postcard.css'
import { useState } from 'react';
import { FaUser, FaHeart, FaVenusMars, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import { toast } from 'sonner';

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
  // Connection status fields
  has_accepted?: boolean;
  sent_pending?: boolean;
  received_pending?: boolean;
}

// API call to send connection request
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

// API call to accept connection request
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

// API call to reject connection request
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

  // Check if bio is too long and needs truncation
  const BIO_MAX_LENGTH = 120;
  const needsTruncation = bio && bio.length > BIO_MAX_LENGTH;
  const displayBio = needsTruncation && !bioExpanded 
    ? bio.slice(0, BIO_MAX_LENGTH) + '...' 
    : bio;

  console.log(`🖼️ Rendering Postcard for ${fullName}, Bio: "${bio}"`);
  console.log(`🔗 Connection status - Accepted: ${has_accepted}, Sent: ${sent_pending}, Received: ${received_pending}`);

  // Mutation for sending connection request
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
      // You might want to refetch the feed here to update the status
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

  // Mutation for accepting connection request
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

  // Mutation for rejecting connection request
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

  // Get gender display
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

  // Get interested in display
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

  // Determine button state and render
  const renderConnectionButton = () => {
    const isConnecting = connectionMutation.isPending;
    const isAccepting = acceptMutation.isPending;
    const isRejecting = rejectMutation.isPending;

    // Already connected (accepted)
    if (has_accepted) {
      return (
        <button className="connect-btn connected" disabled>
          ✓ Connected
        </button>
      );
    }

    // Sent a pending request (waiting for them to accept)
    if (sent_pending) {
      return (
        <button className="connect-btn pending" disabled>
          ⏳ Pending
        </button>
      );
    }

    // Received a pending request (need to accept or reject)
    if (received_pending) {
      return (
        <div className="connect-actions">
          <button 
            className="connect-btn accept" 
            onClick={handleAccept}
            disabled={isAccepting || isRejecting}
          >
            {isAccepting ? 'Accepting...' : '✓ Accept'}
          </button>
          <button 
            className="connect-btn reject" 
            onClick={handleReject}
            disabled={isAccepting || isRejecting}
          >
            {isRejecting ? 'Rejecting...' : '✕ Reject'}
          </button>
        </div>
      );
    }

    // No connection - show Connect button
    return (
      <button 
        className="connect-btn" 
        onClick={handleConnect}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
    );
  };

  return (
    <>
      <div className="overall-post-card-container">
        {/* Post Header */}
        <div className="post-header">
          <div className="post-avatar-container">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={fullName} 
                className="post-avatar-img" 
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement?.querySelector('.post-avatar-fallback')?.classList.add('show');
                }}
              />
            ) : null}
            <div className={`post-avatar-fallback ${!avatarUrl ? 'show' : ''}`}>
              <FaUser className="post-avatar-icon" />
            </div>
          </div>
          <div className="post-user-info">
            <div className="post-user-name">
              <h5>{fullName}</h5>
            </div>
            <div className="post-meta">
              <span className="post-time">{time}</span>
              <span className="post-dot">•</span>
              <span className="post-location">{location}</span>
            </div>
          </div>
        </div>

        {/* Post Image Section */}
        <div className="post-image-wrapper" onClick={handleImageClick}>
          {image ? (
            <>
              <div className={`post-image-loader ${imageLoaded ? 'hidden' : ''}`}>
                <div className="loader-spinner"></div>
              </div>
              <img 
                src={image} 
                alt={bio || `${fullName}'s profile`} 
                className={`post-image-content ${imageLoaded ? 'loaded' : ''}`}
                loading="lazy"
                onLoad={handleImageLoad}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    const fallback = parent.querySelector('.post-image-fallback');
                    if (fallback) {
                      fallback.classList.add('show');
                    }
                    const loader = parent.querySelector('.post-image-loader');
                    if (loader) {
                      loader.classList.add('hidden');
                    }
                  }
                }}
              />
              <div className="post-image-overlay">
                <span>Tap to view full</span>
              </div>
            </>
          ) : (
            <div className="post-image-fallback show">
              <FaUser className="post-image-icon" />
              <span className="post-image-fallback-text">No image available</span>
            </div>
          )}
        </div>

        {/* Post Bio */}
        <div className="post-caption">
          <span className="caption-text">{displayBio || 'No bio available'}</span>
          {needsTruncation && (
            <span className="caption-expand-text" onClick={toggleBio}>
              {bioExpanded ? ' less' : ' more'}
            </span>
          )}
        </div>

        {/* See More Details */}
        <div className="post-see-more">
          <span className="see-more-text" onClick={toggleShowMore}>
            {showMore ? (
              <>See less</>
            ) : (
              <>See more details</>
            )}
          </span>
        </div>

        {/* Additional Details */}
        {showMore && (
          <div className="post-additional-details">
            <div className="details-grid">
              {gender && (
                <div className="detail-item">
                  <FaVenusMars className="detail-icon" />
                  <div className="detail-content">
                    <span className="detail-label">Gender</span>
                    <span className="detail-value">{getGenderDisplay(gender)}</span>
                  </div>
                </div>
              )}
              
              {preference?.interested_in_gender && (
                <div className="detail-item">
                  <FaHeart className="detail-icon" />
                  <div className="detail-content">
                    <span className="detail-label">Interested in</span>
                    <span className="detail-value">{getInterestedInDisplay(preference.interested_in_gender)}</span>
                  </div>
                </div>
              )}
              
              {(preference?.minimum_age || preference?.maximum_age) && (
                <div className="detail-item">
                  <FaCalendarAlt className="detail-icon" />
                  <div className="detail-content">
                    <span className="detail-label">Age preference</span>
                    <span className="detail-value">
                      {preference?.minimum_age || 'Any'} - {preference?.maximum_age || 'Any'}
                    </span>
                  </div>
                </div>
              )}
              
              {location && (
                <div className="detail-item">
                  <FaMapMarkerAlt className="detail-icon" />
                  <div className="detail-content">
                    <span className="detail-label">Location</span>
                    <span className="detail-value">{location}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connection Button Section */}
        <div className="post-connect-section">
          {renderConnectionButton()}
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {showFullImage && image && (
        <div className="full-image-modal" onClick={handleCloseFullImage}>
          <div className="full-image-container">
            <img 
              src={image} 
              alt={bio || `${fullName}'s profile`} 
              className="full-image-content"
              loading="eager"
            />
            <button className="close-full-image" onClick={handleCloseFullImage}>
              ✕
            </button>
            <div className="full-image-caption">
              <strong>{fullName}</strong> {bio || 'No bio available'}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Postcard;