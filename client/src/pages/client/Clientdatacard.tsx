import React, { useState } from 'react';
import { FaHeart, FaMapMarkerAlt, FaCalendarAlt, FaVenusMars, FaUser, FaBriefcase, FaStar, FaLock } from 'react-icons/fa';
import { useMutation } from '@tanstack/react-query';
import { toast } from '../../store/Toaststore';
import './clientdatacard.css';

export interface ClientdatacardProps {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  country: string | null;
  county: string | null;
  location: string | null;
  occupation: string | null;
  interests: string | null;
  image: string | null;
  info: string | null;
  completionPercentage?: number;
  hasImage?: boolean;
  hasBio?: boolean;
  isClickable?: boolean;
}

interface HookupResponse {
  message: string;
  hookup_id: number;
}

interface HookupError {
  error?: string;
  message?: string;
  non_field_errors?: string[];
}

const Clientdatacard: React.FC<ClientdatacardProps> = ({
  id,
  name,
  age,
  gender,
  country,
  county,
  location,
  occupation,
  interests,
  image,
  info,
  completionPercentage = 0,
  hasImage = false,
  hasBio = false,
  isClickable = true,
}) => {
  const [showModal, setShowModal] = useState(false);
  
  const apiUrl = import.meta.env.VITE_API_URL;

  // Create hookup mutation
  const createHookupMutation = useMutation<HookupResponse, HookupError, { receiver_id: string }>({
    mutationFn: async (data) => {
      const response = await fetch(`${apiUrl}/hookup/create-hookup/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw responseData;
      }

      return responseData;
    },
    onSuccess: (data) => {
      toast.success(data.message || `Hookup request sent to ${name}!`, {
        title: '✓ Hookup Request Sent',
        icon: '💚',
        duration: 5000,
      });
    },
    onError: (error: HookupError) => {
      if (error.error === 'You cannot hookup with yourself') {
        toast.warning(`You can't send a hookup request to yourself, ${name}!`, {
          title: '⚠️ Invalid Request',
          icon: '⚠️',
          duration: 4000,
        });
      } 
      else if (error.message === 'You already requested this hookup') {
        toast.info(`You've already sent a hookup request to ${name}!`, {
          title: 'ℹ️ Request Already Sent',
          icon: '🔄',
          duration: 5000,
        });
      }
      else if (error.error === 'Receiver not found') {
        toast.error(`${name} seems to be unavailable right now.`, {
          title: '❌ Not Found',
          icon: '🔍',
          duration: 4000,
        });
      }
      else if (error.error === 'receiver_id is required') {
        toast.error('Something went wrong. Please try again!', {
          title: '❌ Error',
          icon: '⚠️',
          duration: 4000,
        });
      }
      else if (error.error) {
        toast.error(error.error, {
          title: '❌ Hookup Request Failed',
          icon: '💔',
          duration: 5000,
        });
      }
      else if (error.non_field_errors && error.non_field_errors.length > 0) {
        toast.error(error.non_field_errors[0], {
          title: '❌ Request Failed',
          icon: '⚠️',
          duration: 5000,
        });
      }
      else {
        toast.error('Something went wrong. Please try again!', {
          title: '❌ Connection Failed',
          icon: '🔌',
          duration: 5000,
        });
      }
    },
  });

  const handleConnect = () => {
    if (!isClickable) {
      toast.warning('Complete your profile to unlock hookup requests!', {
        title: '🔒 Profile Incomplete',
        icon: '🔒',
        duration: 4000,
      });
      return;
    }
    
    // Send the receiver_id (client profile ID)
    createHookupMutation.mutate({ receiver_id: id });
  };

  const handleImageClick = () => {
    if (!isClickable) {
      toast.info('Complete your profile to view full images!', {
        title: 'ℹ️ Unlock Features',
        icon: '🔓',
        duration: 3000,
      });
      return;
    }
    setShowModal(true);
  };

  // Get initials for default avatar
  const getInitials = () => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const defaultImage = 'https://via.placeholder.com/400x300?text=No+Image+Available';

  return (
    <>
      <article className={`cd-card ${!isClickable ? 'cd-card--disabled' : ''}`}>
        {/* Lock Overlay for Disabled Cards */}
        {!isClickable && (
          <div className="cd-card__lock-overlay">
            <div className="cd-card__lock-content">
              <FaLock className="cd-card__lock-icon" />
              <span className="cd-card__lock-text">Complete profile to unlock</span>
            </div>
          </div>
        )}

        {/* Completion Badge */}
        {completionPercentage > 0 && (
          <div className="cd-card__completion-badge">
            <svg className="cd-card__completion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="cd-card__completion-percent">{completionPercentage}%</span>
            <span className="cd-card__completion-label">Complete</span>
          </div>
        )}

        {/* Image Section */}
        <div 
          className={`cd-card__image-wrapper ${!isClickable ? 'cd-card__image-wrapper--disabled' : ''}`} 
          onClick={handleImageClick}
        >
          {hasImage && image ? (
            <img 
              src={image} 
              alt={name} 
              className="cd-card__image"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  const defaultDiv = document.createElement('div');
                  defaultDiv.className = 'cd-card__default-image';
                  defaultDiv.innerHTML = `<div class="cd-card__default-content"><span class="cd-card__default-icon">📸</span><span class="cd-card__default-text">No Image</span><span class="cd-card__default-initials">${getInitials()}</span></div>`;
                  parent.appendChild(defaultDiv);
                }
              }}
            />
          ) : (
            <div className="cd-card__default-image">
              <div className="cd-card__default-content">
                <FaUser className="cd-card__default-icon" />
                <span className="cd-card__default-text">No Photo Available</span>
                <span className="cd-card__default-initials">{getInitials()}</span>
              </div>
            </div>
          )}
          {isClickable && (
            <div className="cd-card__image-overlay">
              <span className="cd-card__expand-icon">🔍</span>
              <span className="cd-card__expand-text">View Full Image</span>
            </div>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="cd-card__scrollable-content">
          <div className="cd-card__content">
            {/* Name Section - Unique Styling */}
            <div className="cd-card__name-section">
              <h2 className="cd-card__name">{name}</h2>
              {completionPercentage === 100 && (
                <span className="cd-card__verified-badge">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                </span>
              )}
            </div>

            {/* Key Info Grid - 2 columns */}
            <div className="cd-card__info-grid">
              {age !== null && age !== undefined && (
                <div className="cd-card__info-item">
                  <div className="cd-card__info-icon-wrapper">
                    <FaCalendarAlt className="cd-card__info-icon" />
                  </div>
                  <div className="cd-card__info-content">
                    <span className="cd-card__info-label">Age</span>
                    <span className="cd-card__info-value">{age} years</span>
                  </div>
                </div>
              )}

              {gender && (
                <div className="cd-card__info-item">
                  <div className="cd-card__info-icon-wrapper">
                    <FaVenusMars className="cd-card__info-icon" />
                  </div>
                  <div className="cd-card__info-content">
                    <span className="cd-card__info-label">Gender</span>
                    <span className="cd-card__info-value cd-card__info-value--capitalize">{gender}</span>
                  </div>
                </div>
              )}

              {country && county && (
                <div className="cd-card__info-item cd-card__info-item--full">
                  <div className="cd-card__info-icon-wrapper">
                    <FaMapMarkerAlt className="cd-card__info-icon" />
                  </div>
                  <div className="cd-card__info-content">
                    <span className="cd-card__info-label">Location</span>
                    <span className="cd-card__info-value">{country}, {county}</span>
                  </div>
                </div>
              )}

              {location && (
                <div className="cd-card__info-item cd-card__info-item--full">
                  <div className="cd-card__info-icon-wrapper">
                    <FaMapMarkerAlt className="cd-card__info-icon" />
                  </div>
                  <div className="cd-card__info-content">
                    <span className="cd-card__info-label">Area</span>
                    <span className="cd-card__info-value">{location}</span>
                  </div>
                </div>
              )}

              {occupation && (
                <div className="cd-card__info-item cd-card__info-item--full">
                  <div className="cd-card__info-icon-wrapper">
                    <FaBriefcase className="cd-card__info-icon" />
                  </div>
                  <div className="cd-card__info-content">
                    <span className="cd-card__info-label">Occupation</span>
                    <span className="cd-card__info-value">{occupation}</span>
                  </div>
                </div>
              )}

              {interests && (
                <div className="cd-card__info-item cd-card__info-item--full">
                  <div className="cd-card__info-icon-wrapper">
                    <FaStar className="cd-card__info-icon" />
                  </div>
                  <div className="cd-card__info-content">
                    <span className="cd-card__info-label">Interests</span>
                    <span className="cd-card__info-value">{interests}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bio/Info Section */}
            {(info || !hasBio) && (
              <div className="cd-card__bio-section">
                <div className="cd-card__bio-header">
                  <FaHeart className="cd-card__bio-icon" />
                  <span className="cd-card__bio-label">About</span>
                </div>
                <p className="cd-card__bio-text">
                  {info || '✨ This profile is still being completed. Check back soon! ✨'}
                </p>
                {!hasBio && (
                  <div className="cd-card__incomplete-badge">
                    <span>✍️ Bio coming soon</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fixed Button Section */}
        <div className="cd-card__button-wrapper">
          <button 
            className={`cd-card__connect-btn ${!isClickable ? 'cd-card__connect-btn--disabled' : ''}`} 
            onClick={handleConnect}
            disabled={!isClickable || createHookupMutation.isPending}
          >
            {createHookupMutation.isPending ? (
              <>
                <svg className="cd-card__btn-spinner" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="31.4 31.4" />
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="31.4 31.4" strokeDashoffset="0" />
                </svg>
                Sending Request...
              </>
            ) : (
              <>
                <FaHeart className="cd-card__btn-icon" />
                Connect Now
              </>
            )}
          </button>
        </div>
      </article>

      {/* Full Screen Modal - Only show if clickable */}
      {isClickable && showModal && (
        <div className="cd-modal" onClick={() => setShowModal(false)}>
          <button className="cd-modal__close" onClick={() => setShowModal(false)}>×</button>
          
          <div className="cd-modal__container" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal__image-wrapper">
              <img 
                src={image || defaultImage} 
                alt={name} 
                className="cd-modal__image"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultImage;
                }}
              />
            </div>
            
            <div className="cd-modal__caption">
              <h3 className="cd-modal__name">{name}</h3>
              <p className="cd-modal__details">
                {age ? `${age} years` : 'Age not specified'} · {gender || 'Gender not specified'}
              </p>
              {country && county && (
                <p className="cd-modal__location">{country}, {county}</p>
              )}
              {location && <p className="cd-modal__location">{location}</p>}
              {!hasBio && (
                <p className="cd-modal__note">✨ Profile still being completed</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Clientdatacard;