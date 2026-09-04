// components/Advertcard.tsx
// Advert Card Component for Feed - Unique class names
// ============================================================

import './advertcard.css'
import { useState } from 'react';
import { FiImage, FiVideo, FiPlay, FiYoutube, FiExternalLink, FiClock } from 'react-icons/fi'

interface AdvertcardProps {
  id: string;
  title: string;
  description: string | null;
  url: string;
  mediaType: 'image' | 'video';
  publicId: string | null;
  created_at: string;
  time: string;
}

// Helper functions
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

function Advertcard({
  title,
  description,
  url,
  mediaType,
  publicId,
  time
}: AdvertcardProps) {
  
  const [showFullMedia, setShowFullMedia] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Determine if URL is YouTube
  const isYoutube = isYouTubeUrl(url);
  const youtubeId = extractYouTubeId(url);
  const isDirectVideoFile = isDirectVideo(url);

  const DESCRIPTION_MAX_LENGTH = 150;
  const needsTruncation = description && description.length > DESCRIPTION_MAX_LENGTH;
  const displayDescription = needsTruncation && !showMore 
    ? description.slice(0, DESCRIPTION_MAX_LENGTH) + '...' 
    : description;

  const handleMediaClick = () => {
    setShowFullMedia(true);
  };

  const handleCloseFullMedia = () => {
    setShowFullMedia(false);
  };

  const handleMediaLoad = () => {
    setMediaLoaded(true);
  };

  const toggleShowMore = () => {
    setShowMore(!showMore);
  };

  // Render media based on type
  const renderMedia = () => {
    if (mediaType === 'image') {
      return (
        <div className="acard-image-wrapper" onClick={handleMediaClick}>
          <div className={`acard-image-loader ${mediaLoaded ? 'hidden' : ''}`}>
            <div className="acard-loader-spinner"></div>
          </div>
          <img 
            src={url} 
            alt={title}
            className={`acard-image-content ${mediaLoaded ? 'loaded' : ''}`}
            loading="lazy"
            onLoad={handleMediaLoad}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                const fallback = parent.querySelector('.acard-image-fallback');
                if (fallback) {
                  fallback.classList.add('show');
                }
                const loader = parent.querySelector('.acard-image-loader');
                if (loader) {
                  loader.classList.add('hidden');
                }
              }
            }}
          />
          <div className="acard-image-overlay">
            <span>Tap to view full</span>
          </div>
          <div className="acard-image-fallback">
            <FiImage className="acard-image-icon" />
            <span className="acard-image-fallback-text">Image not available</span>
          </div>
          {publicId && (
            <span className="acard-cloudinary-badge">☁️ Cloudinary</span>
          )}
        </div>
      );
    } else {
      // Video
      if (isYoutube && youtubeId) {
        return (
          <div className="acard-video-wrapper">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title={title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="acard-youtube-iframe"
            />
            <span className="acard-platform-badge youtube">
              <FiYoutube /> YouTube
            </span>
          </div>
        );
      } else if (isDirectVideoFile) {
        return (
          <div className="acard-video-wrapper">
            <video
              src={url}
              controls
              className="acard-video-element"
            />
            <span className="acard-platform-badge direct">
              <FiVideo /> Video
            </span>
          </div>
        );
      } else {
        return (
          <div className="acard-video-wrapper" onClick={handleMediaClick}>
            <div className="acard-video-placeholder">
              <FiPlay className="acard-video-placeholder-icon" />
              <span className="acard-video-placeholder-text">Video</span>
              <button 
                className="acard-video-link-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(url, '_blank');
                }}
              >
                <FiExternalLink /> Watch Video
              </button>
            </div>
            <span className="acard-platform-badge external">
              <FiExternalLink /> External Video
            </span>
          </div>
        );
      }
    }
  };

  return (
    <>
      <div className="acard-container">
        {/* Advert Header - Shows "Advert" instead of user info */}
        <div className="acard-header">
          <div className="acard-advert-badge">
            <span className="acard-advert-icon">📢</span>
            <span className="acard-advert-label">Advert</span>
          </div>
          <div className="acard-meta">
            <span className="acard-time">
              <FiClock /> {time}
            </span>
            <span className="acard-dot">•</span>
            <span className="acard-media-type">
              {mediaType === 'image' ? <FiImage /> : <FiVideo />} {mediaType}
            </span>
          </div>
        </div>

        {/* Media Section */}
        <div className="acard-media-wrapper">
          {renderMedia()}
        </div>

        {/* Content Section */}
        <div className="acard-content">
          <h3 className="acard-title">{title}</h3>
          
          {description && (
            <div className="acard-description">
              <span className="acard-description-text">{displayDescription}</span>
              {needsTruncation && (
                <span className="acard-description-expand" onClick={toggleShowMore}>
                  {showMore ? ' less' : ' more'}
                </span>
              )}
            </div>
          )}

          <div className="acard-footer">
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="acard-link"
            >
              <FiExternalLink /> View Advert
            </a>
            {publicId && (
              <span className="acard-source-badge cloudinary">
                ☁️ Cloudinary
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Full Screen Media Modal */}
      {showFullMedia && mediaType === 'image' && (
        <div className="acard-full-modal" onClick={handleCloseFullMedia}>
          <div className="acard-full-container">
            <img 
              src={url} 
              alt={title} 
              className="acard-full-image"
              loading="eager"
            />
            <button className="acard-full-close" onClick={handleCloseFullMedia}>
              ✕
            </button>
            <div className="acard-full-caption">
              <strong>{title}</strong> {description || 'No description available'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Advertcard;