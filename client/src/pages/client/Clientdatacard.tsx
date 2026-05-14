import React from 'react';
import {  FaUser, FaLock, FaEye } from 'react-icons/fa';
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
  onClick?: () => void;
}

const Clientdatacard: React.FC<ClientdatacardProps> = ({
  name,
  age,
  gender,
  country,
  county,
  location,
  image,
  info,
  hasImage = false,
  isClickable = true,
  onClick,
}) => {
  const handleCardClick = () => {
    if (isClickable && onClick) {
      onClick();
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isClickable && onClick) {
      onClick();
    }
  };

  // Get initials for avatar circle
  const getInitials = () => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get short description (max 60 chars)
  const getShortDescription = () => {
    const locationText = country && county ? `${country}, ${county}` : location;
    const ageGender = `${age || ''}${age && gender ? ' • ' : ''}${gender || ''}`;
    const bioText = info || 'No bio yet';
    
    // Create a compact description
    let description = '';
    if (locationText) description += locationText;
    if (ageGender && description) description += ` • ${ageGender}`;
    else if (ageGender) description += ageGender;
    if (bioText && description) description += ` • ${bioText}`;
    else if (bioText) description += bioText;
    
    return description.length > 60 ? `${description.substring(0, 60)}...` : description;
  };

  return (
    <article 
      className={`cd-card ${!isClickable ? 'cd-card--disabled' : 'cd-card--clickable'}`} 
      onClick={handleCardClick}
    >
      {/* Lock Overlay for Disabled Cards */}
      {!isClickable && (
        <div className="cd-card__lock-overlay">
          <div className="cd-card__lock-content">
            <FaLock className="cd-card__lock-icon" />
            <span className="cd-card__lock-text">Complete profile to unlock</span>
          </div>
        </div>
      )}

      {/* Image Section - MAIN FOCUS (16:9) */}
      <div className="cd-card__image-wrapper">
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
                defaultDiv.innerHTML = `<div class="cd-card__default-content"><span class="cd-card__default-icon">📸</span></div>`;
                parent.appendChild(defaultDiv);
              }
            }}
          />
        ) : (
          <div className="cd-card__default-image">
            <div className="cd-card__default-content">
              <FaUser className="cd-card__default-icon" />
            </div>
          </div>
        )}
      </div>

      {/* Compact Info Section - SMALL like YouTube */}
      <div className="cd-card__info-section">
        {/* Left side - Initials Circle */}
        <div className="cd-card__avatar">
          <div className="cd-card__avatar-circle">
            {getInitials()}
          </div>
        </div>

        {/* Right side - Compact Description */}
        <div className="cd-card__details">
          <h3 className="cd-card__title">{name}</h3>
          <p className="cd-card__description">{getShortDescription()}</p>
          
          {/* View Details Button - Small inline */}
          {isClickable && (
            <button 
              className="cd-card__details-button"
              onClick={handleButtonClick}
              aria-label={`View details for ${name}`}
            >
              <FaEye className="cd-card__button-icon" />
              View Details
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default Clientdatacard;