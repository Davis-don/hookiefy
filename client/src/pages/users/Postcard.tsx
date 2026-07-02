import './postcard.css'
import { useState } from 'react';
import { FaUser, FaChevronDown, FaChevronUp, FaHeart, FaVenusMars, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';

interface PostcardProps {
  id: string;
  firstName: string;
  lastName: string;
  time: string;
  location: string;
  image: string | null;
  caption: string;
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

function Postcard({ 
  firstName, 
  lastName, 
  time, 
  location, 
  image, 
  caption, 
  profile_image_url,
  preference,
  gender,
}: PostcardProps) {
  const [showFullImage, setShowFullImage] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const fullName = `${firstName} ${lastName}`;
  
  // Use profile image if available, otherwise null
  const avatarUrl = profile_image_url || null;

  const handleConnect = () => {
    console.log(`Connect request sent to ${fullName}`);
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

        {/* Post Image Section - Shows user icon if no image */}
        <div className="post-image-wrapper" onClick={handleImageClick}>
          {image ? (
            <>
              <img 
                src={image} 
                alt={caption} 
                className="post-image-content" 
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    const fallback = parent.querySelector('.post-image-fallback');
                    if (fallback) {
                      fallback.classList.add('show');
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

        {/* Post Caption */}
        <div className="post-caption">
          <strong>{fullName}</strong> {caption}
        </div>

        {/* See More Button */}
        <div className="post-see-more">
          <button className="see-more-btn" onClick={toggleShowMore}>
            {showMore ? (
              <>
                <FaChevronUp /> See less
              </>
            ) : (
              <>
                <FaChevronDown /> See more
              </>
            )}
          </button>
        </div>

        {/* Additional Details - Shown when "See more" is clicked */}
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

        {/* Connect Button Only */}
        <div className="post-connect-section">
          <button className="connect-btn" onClick={handleConnect}>
            Connect
          </button>
        </div>
      </div>

      {/* Full Screen Image Modal - Only if image exists */}
      {showFullImage && image && (
        <div className="full-image-modal" onClick={handleCloseFullImage}>
          <div className="full-image-container">
            <img src={image} alt={caption} className="full-image-content" />
            <button className="close-full-image" onClick={handleCloseFullImage}>
              ✕
            </button>
            <div className="full-image-caption">
              <strong>{fullName}</strong> {caption}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Postcard