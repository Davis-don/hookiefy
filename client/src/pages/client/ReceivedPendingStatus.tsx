import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaHeart, FaClock, FaCheck, FaTimes, FaUser, FaMapMarkerAlt, FaVenusMars, FaBriefcase, FaHeartbeat, FaSpinner, FaExpand, FaCompress, FaSearchPlus, FaSearchMinus, FaRegSmile, FaRegHeart, FaShieldAlt, FaStar, FaUserCircle, FaTimesCircle } from 'react-icons/fa';
import './StatusComponents.css';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface Bio {
  age: number | null;
  gender: string | null;
  country: string | null;
  county: string | null;
  location_desc: string | null;
  info: string | null;
  phone_number: string | null;
  occupation: string | null;
  interests: string | null;
  uploaded_img: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: number;
  user: User;
  bio: Bio | null;
  full_name: string;
  has_image: boolean;
  has_bio: boolean;
  profile_completion_percentage: number;
  created_at: string;
  updated_at: string;
}

interface Hookup {
  id: number;
  sender_name: string;
  sender_id: number;
  created_at: string;
}

interface ReceivedPendingStatusProps {
  hookup: Hookup;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}

const ReceivedPendingStatus: React.FC<ReceivedPendingStatusProps> = ({ hookup, onApprove, onReject, isProcessing }) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0, distance: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Fetch sender's full profile
  const { data: profile, isLoading, error } = useQuery<Profile>({
    queryKey: ['sender-profile', hookup.sender_id],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/profiles/profile/${hookup.sender_id}/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch profile');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleImageClick = (imageUrl: string | null) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setShowImageModal(true);
      setZoomLevel(1);
      setImagePosition({ x: 0, y: 0 });
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
    // Restore body scroll
    document.body.style.overflow = '';
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
    if (zoomLevel <= 1) {
      setImagePosition({ x: 0, y: 0 });
    }
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
  };

  // Mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && zoomLevel > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setImagePosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch events for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && zoomLevel > 1) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      setTouchStart({ ...touchStart, distance });
    } else if (e.touches.length === 1 && zoomLevel > 1) {
      // Pan
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - imagePosition.x, y: e.touches[0].clientY - imagePosition.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && zoomLevel > 1 && touchStart.distance > 0) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const newDistance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      const scale = newDistance / touchStart.distance;
      const newZoom = Math.min(Math.max(zoomLevel * scale, 0.5), 4);
      setZoomLevel(newZoom);
      setTouchStart({ ...touchStart, distance: newDistance });
    } else if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      setImagePosition({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchStart({ ...touchStart, distance: 0 });
  };

  // Keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showImageModal) {
        if (e.key === 'Escape') {
          closeImageModal();
        } else if (e.key === '+' || e.key === '=') {
          handleZoomIn();
        } else if (e.key === '-' || e.key === '_') {
          handleZoomOut();
        } else if (e.key === '0') {
          handleResetZoom();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showImageModal]);

  // Loading state
  if (isLoading) {
    return (
      <div className="official-status-card official-loading">
        <div className="official-loading-animation">
          <div className="official-loading-ring"></div>
          <FaHeart className="official-loading-icon" />
        </div>
        <div className="official-loading-content">
          <h4>Loading Profile Details</h4>
          <p>Please wait while we fetch user information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="official-status-card official-error">
        <div className="official-error-icon">⚠️</div>
        <div className="official-error-content">
          <h4>Unable to Load Profile</h4>
          <p>{hookup.sender_name} wants to connect with you</p>
          <div className="official-meta">
            <FaClock />
            <span>Received {formatDate(hookup.created_at)}</span>
          </div>
          <div className="official-actions">
            <button className="official-btn official-btn-primary" onClick={onApprove} disabled={isProcessing}>
              <FaCheck />
              Accept Request
            </button>
            <button className="official-btn official-btn-secondary" onClick={onReject} disabled={isProcessing}>
              <FaTimes />
              Decline
            </button>
          </div>
        </div>
      </div>
    );
  }

  const bio = profile.bio;
  const profileImage = bio?.uploaded_img;
  const completionPercentage = profile.profile_completion_percentage;

  return (
    <>
      <div className="official-status-card official-pending">
        {/* Header Section */}
        <div className="official-card-header">
          <div className="official-header-badge">
            <FaRegHeart className="official-badge-icon" />
            <span>New Connection Request</span>
          </div>
          <div className="official-header-date">
            <FaClock />
            <span>{formatDate(hookup.created_at)}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="official-card-body">
          {/* Profile Section with Large Clickable Image */}
          <div className="official-profile-section">
            {/* Large Clickable Profile Image */}
            <div className="official-image-container">
              {profileImage ? (
                <div className="official-image-wrapper" onClick={() => handleImageClick(profileImage)}>
                  <img src={profileImage} alt={profile.full_name} className="official-profile-image" />
                  <div className="official-image-overlay">
                    <FaExpand className="official-zoom-icon" />
                    <span>Click to View Full Size</span>
                  </div>
                </div>
              ) : (
                <div className="official-image-placeholder" onClick={() => {}}>
                  <FaUserCircle className="official-placeholder-icon" />
                  <div className="official-image-overlay">
                    <span>No Image Available</span>
                  </div>
                </div>
              )}
              
              {/* Completion Badge */}
              <div className="official-completion-badge">
                <div className="official-completion-ring">
                  <svg width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="20" fill="none" stroke="#e5e7eb" strokeWidth="2"/>
                    <circle 
                      cx="22" cy="22" r="20" fill="none" 
                      stroke="#10b981" strokeWidth="2"
                      strokeDasharray={`${completionPercentage * 1.26} 126`}
                      strokeLinecap="round"
                      transform="rotate(-90 22 22)"
                    />
                  </svg>
                  <span className="official-completion-text">{completionPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Name and Greeting */}
            <div className="official-greeting">
              <h2 className="official-name">{profile.full_name}</h2>
              <div className="official-greeting-message">
                <FaRegSmile className="official-greeting-icon" />
                <span>Would like to connect with you!</span>
              </div>
            </div>
          </div>

          {/* Personal Details Grid */}
          <div className="official-details-grid">
            {bio?.age && (
              <div className="official-detail-card">
                <div className="official-detail-icon">🎂</div>
                <div className="official-detail-info">
                  <span className="official-detail-label">Age</span>
                  <span className="official-detail-value">{bio.age} years</span>
                </div>
              </div>
            )}
            
            {bio?.gender && (
              <div className="official-detail-card">
                <div className="official-detail-icon">
                  <FaVenusMars />
                </div>
                <div className="official-detail-info">
                  <span className="official-detail-label">Gender</span>
                  <span className="official-detail-value">{bio.gender}</span>
                </div>
              </div>
            )}

            {bio?.occupation && (
              <div className="official-detail-card">
                <div className="official-detail-icon">
                  <FaBriefcase />
                </div>
                <div className="official-detail-info">
                  <span className="official-detail-label">Occupation</span>
                  <span className="official-detail-value">{bio.occupation}</span>
                </div>
              </div>
            )}
          </div>

          {/* Location Section */}
          {(bio?.country || bio?.county || bio?.location_desc) && (
            <div className="official-location-section">
              <div className="official-section-header">
                <FaMapMarkerAlt className="official-section-icon" />
                <h3>Location</h3>
              </div>
              <div className="official-location-content">
                {(bio.country || bio.county) && (
                  <div className="official-location-tags">
                    {bio.country && <span className="official-tag official-tag-location">{bio.country}</span>}
                    {bio.county && <span className="official-tag official-tag-location">{bio.county}</span>}
                  </div>
                )}
                {bio?.location_desc && (
                  <p className="official-location-desc">{bio.location_desc}</p>
                )}
              </div>
            </div>
          )}

          {/* Bio Section */}
          {bio?.info && (
            <div className="official-bio-section">
              <div className="official-section-header">
                <FaHeartbeat className="official-section-icon" />
                <h3>About Me</h3>
              </div>
              <p className="official-bio-text">{bio.info}</p>
            </div>
          )}

          {/* Interests Section */}
          {bio?.interests && (
            <div className="official-interests-section">
              <div className="official-section-header">
                <FaStar className="official-section-icon" />
                <h3>Interests & Hobbies</h3>
              </div>
              <div className="official-interests-grid">
                {bio.interests.split(',').map((interest, index) => (
                  <span key={index} className="official-interest-tag">
                    {interest.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Trust & Safety Note */}
          <div className="official-trust-banner">
            <FaShieldAlt className="official-trust-icon" />
            <div className="official-trust-content">
              <strong>Trust & Safety First</strong>
              <p>All profiles are verified. Report any suspicious activity immediately.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="official-actions-container">
            <button 
              className="official-btn official-btn-accept" 
              onClick={onApprove}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <FaSpinner className="official-spinner" />
              ) : (
                <FaCheck />
              )}
              <span>Accept Connection</span>
            </button>
            <button 
              className="official-btn official-btn-decline" 
              onClick={onReject}
              disabled={isProcessing}
            >
              <FaTimes />
              <span>Decline Request</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Full-Screen Image Modal with Zoom & Pan */}
      {showImageModal && selectedImage && (
        <div className="official-modal-overlay" onClick={closeImageModal}>
          <div className="official-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="official-modal-header">
              <div className="official-modal-title-section">
                <FaUser className="official-modal-icon" />
                <h3 className="official-modal-title">{profile.full_name}</h3>
                <span className="official-modal-badge">Profile Photo</span>
              </div>
              <div className="official-modal-controls">
                <button 
                  className="official-modal-control-btn" 
                  onClick={handleZoomOut} 
                  disabled={zoomLevel <= 0.5}
                  title="Zoom Out (-)"
                >
                  <FaSearchMinus />
                </button>
                <span className="official-modal-zoom-percent">{Math.round(zoomLevel * 100)}%</span>
                <button 
                  className="official-modal-control-btn" 
                  onClick={handleZoomIn} 
                  disabled={zoomLevel >= 4}
                  title="Zoom In (+)"
                >
                  <FaSearchPlus />
                </button>
                <button 
                  className="official-modal-control-btn" 
                  onClick={handleResetZoom} 
                  title="Reset Zoom (0)"
                >
                  <FaCompress />
                </button>
                <button 
                  className="official-modal-close-btn" 
                  onClick={closeImageModal} 
                  title="Close (ESC)"
                >
                  <FaTimesCircle />
                </button>
              </div>
            </div>
            
            <div 
              className="official-modal-body"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
              <div className="official-image-viewer">
                <img 
                  ref={imageRef}
                  src={selectedImage} 
                  alt={profile.full_name}
                  className="official-modal-image"
                  style={{
                    transform: `scale(${zoomLevel}) translate(${imagePosition.x / zoomLevel}px, ${imagePosition.y / zoomLevel}px)`,
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1)'
                  }}
                  draggable={false}
                />
              </div>
            </div>
            
            <div className="official-modal-footer">
              <div className="official-modal-instructions">
                <div className="official-instruction">
                  <FaSearchPlus />
                  <span>Scroll / Pinch to zoom</span>
                </div>
                <div className="official-instruction">
                  <span>👆</span>
                  <span>Click & drag to pan</span>
                </div>
                <div className="official-instruction">
                  <span>⌨️</span>
                  <span>+ / - to zoom • 0 to reset • ESC to close</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReceivedPendingStatus;