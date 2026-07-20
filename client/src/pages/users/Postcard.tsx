import './postcard.css'
import { useState } from 'react';
import { FaUser, FaChevronDown, FaChevronUp, FaHeart, FaVenusMars, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authtokenstore';
import { toast } from 'sonner';

interface PostcardProps {
  id: string;
  firstName: string;
  lastName: string;
  time: string;
  location: string;
  image: string | null;
  bio: string; // ✅ This is the user's bio
  profile_image_url?: string | null;
  preference?: {
    interested_in_gender: string;
    minimum_age: number;
    maximum_age: number;
  };
  gender?: string;
  email?: string;
  phone_number?: string;
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

function Postcard({ 
  id,
  firstName, 
  lastName, 
  time, 
  location, 
  image, 
  bio, // ✅ This is the user's bio
  profile_image_url,
  preference,
  gender,
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

  const handleImageClick = () => {
    if (image) {
      setShowFullImage(true);
    }
  };

  const handleCloseFullImage = () => {
    setShowFullImage(false);
  };

  const toggleShowMore = () => {
    setShowMore(!showMore);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const toggleBio = () => {
    setBioExpanded(!bioExpanded);
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

  const isConnecting = connectionMutation.isPending;

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
              <span>{time}</span>
              <span className="post-dot">•</span>
              <span>{location}</span>
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

        {/* ✅ POST BIO - This displays the user's bio below the image */}
        <div className="post-caption">
          <span className="caption-text">{displayBio || 'No bio available'}</span>
          {needsTruncation && (
            <button className="caption-expand-btn" onClick={toggleBio}>
              {bioExpanded ? ' Show less' : ' Show more'}
            </button>
          )}
        </div>

        {/* See More Button - Shows additional details */}
        <div className="post-see-more">
          <button className="see-more-btn" onClick={toggleShowMore}>
            {showMore ? (
              <>
                <FaChevronUp /> See less
              </>
            ) : (
              <>
                <FaChevronDown /> See more details
              </>
            )}
          </button>
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

        {/* Connect Button */}
        <div className="post-connect-section">
          <button 
            className="connect-btn" 
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
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