// ============================================================
// DefaultPostcard.tsx - Postcard for non-authenticated users (Blurred images)
// ============================================================

import './defaultpostcard.css'
import { useState } from 'react'
import { FaUser, FaChevronDown, FaChevronUp, FaVenusMars, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa'

// ============================================================
// TYPES
// ============================================================

interface DefaultPostcardProps {
  id: string
  firstName: string
  lastName: string
  time: string
  location: string
  image: string | null
  avatar: string | null
  bio: string
  gender: string
  interested_in: string
  min_age: number
  max_age: number
  onConnectClick?: () => void
}

// ============================================================
// MAIN COMPONENT
// ============================================================

function DefaultPostcard({ 
  firstName, 
  lastName, 
  time, 
  location, 
  image, 
  avatar,
  bio, 
  gender,
  interested_in,
  min_age,
  max_age,
  onConnectClick
}: DefaultPostcardProps) {
  const [showMore, setShowMore] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [bioExpanded, setBioExpanded] = useState(false)

  const fullName = `${firstName} ${lastName}`
  const avatarUrl = avatar || null

  // Check if bio is too long and needs truncation
  const BIO_MAX_LENGTH = 120
  const needsTruncation = bio && bio.length > BIO_MAX_LENGTH
  const displayBio = needsTruncation && !bioExpanded 
    ? bio.slice(0, BIO_MAX_LENGTH) + '...' 
    : bio

  const toggleShowMore = () => {
    setShowMore(!showMore)
  }

  const toggleBio = () => {
    setBioExpanded(!bioExpanded)
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const handleConnectClick = () => {
    if (onConnectClick) {
      onConnectClick()
    }
  }

  // Get gender display
  const getGenderDisplay = (gender?: string) => {
    if (!gender) return 'Not specified'
    const genderMap: { [key: string]: string } = {
      'M': 'Male',
      'F': 'Female',
      'male': 'Male',
      'female': 'Female',
      'other': 'Other'
    }
    return genderMap[gender] || gender
  }

  return (
    <div className="overall-default-post-card-container">
      {/* Post Header */}
      <div className="default-post-header">
        <div className="default-post-avatar-container">
          {avatarUrl ? (
            <>
              <img 
                src={avatarUrl} 
                alt={fullName} 
                className="default-post-avatar-img" 
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  ;(e.target as HTMLImageElement).parentElement?.querySelector('.default-post-avatar-fallback')?.classList.add('show')
                }}
              />
              {/* Blur overlay for avatar */}
              <div className="default-post-avatar-blur-overlay">
                <span className="default-post-avatar-blur-icon">🔒</span>
              </div>
            </>
          ) : null}
          <div className={`default-post-avatar-fallback ${!avatarUrl ? 'show' : ''}`}>
            <FaUser className="default-post-avatar-icon" />
          </div>
        </div>
        <div className="default-post-user-info">
          <div className="default-post-user-name">
            <h5>{fullName}</h5>
          </div>
          <div className="default-post-meta">
            <span>{time}</span>
            <span className="default-post-dot">•</span>
            <span>{location}</span>
          </div>
        </div>
      </div>

      {/* Post Image Section - BLURRED for non-authenticated users */}
      <div className="default-post-image-wrapper">
        {image ? (
          <>
            <div className={`default-post-image-loader ${imageLoaded ? 'hidden' : ''}`}>
              <div className="default-loader-spinner"></div>
            </div>
            <img 
              src={image} 
              alt={`${fullName}'s profile`}
              className={`default-post-image-content ${imageLoaded ? 'loaded' : ''}`}
              loading="lazy"
              onLoad={handleImageLoad}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
                const parent = (e.target as HTMLImageElement).parentElement
                if (parent) {
                  const fallback = parent.querySelector('.default-post-image-fallback')
                  if (fallback) {
                    fallback.classList.add('show')
                  }
                  const loader = parent.querySelector('.default-post-image-loader')
                  if (loader) {
                    loader.classList.add('hidden')
                  }
                }
              }}
            />
            {/* Blur overlay for image */}
            <div className="default-post-image-blur-overlay">
              <div className="default-post-blur-content">
                <span className="default-post-blur-icon">🔒</span>
                <span className="default-post-blur-text">Login to view this post</span>
              </div>
            </div>
          </>
        ) : (
          <div className="default-post-image-fallback show">
            <FaUser className="default-post-image-icon" />
            <span className="default-post-image-fallback-text">No image available</span>
          </div>
        )}
      </div>

      {/* Post Bio */}
      <div className="default-post-caption">
        <span className="default-caption-text">{displayBio || 'No bio available'}</span>
        {needsTruncation && (
          <button className="default-caption-expand-btn" onClick={toggleBio}>
            {bioExpanded ? ' Show less' : ' Show more'}
          </button>
        )}
      </div>

      {/* See More Button */}
      <div className="default-post-see-more">
        <button className="default-see-more-btn" onClick={toggleShowMore}>
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
        <div className="default-post-additional-details">
          <div className="default-details-grid">
            {gender && (
              <div className="default-detail-item">
                <FaVenusMars className="default-detail-icon" />
                <div className="default-detail-content">
                  <span className="default-detail-label">Gender</span>
                  <span className="default-detail-value">{getGenderDisplay(gender)}</span>
                </div>
              </div>
            )}
            
            {interested_in && (
              <div className="default-detail-item">
                <FaVenusMars className="default-detail-icon" />
                <div className="default-detail-content">
                  <span className="default-detail-label">Interested in</span>
                  <span className="default-detail-value">{interested_in}</span>
                </div>
              </div>
            )}
            
            {(min_age || max_age) && (
              <div className="default-detail-item">
                <FaCalendarAlt className="default-detail-icon" />
                <div className="default-detail-content">
                  <span className="default-detail-label">Age preference</span>
                  <span className="default-detail-value">
                    {min_age || 'Any'} - {max_age || 'Any'}
                  </span>
                </div>
              </div>
            )}
            
            {location && (
              <div className="default-detail-item">
                <FaMapMarkerAlt className="default-detail-icon" />
                <div className="default-detail-content">
                  <span className="default-detail-label">Location</span>
                  <span className="default-detail-value">{location}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connect Button - Opens login modal */}
      <div className="default-post-connect-section">
        <button className="default-connect-btn" onClick={handleConnectClick}>
          Connect
        </button>
      </div>
    </div>
  )
}

export default DefaultPostcard