// components/Advertcard.tsx
// Content Card Component for Feed - Unique class names
// ============================================================

import './advertcard.css'
import { useState } from 'react';
import { FiImage, FiVideo, FiPlay, FiYoutube, FiExternalLink, FiClock, FiAlertCircle } from 'react-icons/fi'

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

// Check if URL is a direct image
const isDirectImage = (url: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
  return imageExtensions.some(ext => url.toLowerCase().includes(ext));
};

// Check if URL is from Unsplash (needs special handling)
const isUnsplashUrl = (url: string): boolean => {
  return url.includes('unsplash.com');
};

// Convert Unsplash URL to direct image URL
const getUnsplashDirectUrl = (url: string): string | null => {
  // Extract the photo ID from Unsplash URL
  // e.g., https://unsplash.com/photos/airplane-wing-above-white-clouds-K1RmYc5pRks
  const match = url.match(/unsplash\.com\/photos\/([^\/?]+)/);
  if (match && match[1]) {
    // Get the last part which is the ID
    const parts = match[1].split('-');
    const id = parts[parts.length - 1];
    if (id) {
      return `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop`;
    }
  }
  return null;
};

// Check if URL is from a known image hosting service
const isImageHostingUrl = (url: string): boolean => {
  const hosts = [
    'images.unsplash.com',
    'res.cloudinary.com',
    'cdn.pixabay.com',
    'i.imgur.com',
    'imgur.com',
    'ibb.co',
    'postimg.cc',
    'imgbb.com',
    'images.pexels.com',
    'cdn.pexels.com'
  ];
  return hosts.some(host => url.includes(host));
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
  const [imageError, setImageError] = useState(false);

  // Determine if URL is YouTube
  const isYoutube = isYouTubeUrl(url);
  const youtubeId = extractYouTubeId(url);
  const isDirectVideoFile = isDirectVideo(url);
  const isUnsplash = isUnsplashUrl(url);
  const isImageHosting = isImageHostingUrl(url);
  const isDirectImageFile = isDirectImage(url);

  // Get the actual image URL to display
  const getDisplayImageUrl = (): string => {
    // If it's a direct image URL or from Cloudinary, use as is
    if (isDirectImageFile || (publicId && url.includes('cloudinary'))) {
      return url;
    }
    
    // If it's Unsplash, try to get direct URL
    if (isUnsplash) {
      const directUrl = getUnsplashDirectUrl(url);
      if (directUrl) return directUrl;
    }
    
    // If it's from an image hosting service, try to use as is
    if (isImageHosting) {
      return url;
    }
    
    // Otherwise return the original URL (will show error if not loadable)
    return url;
  };

  const displayImageUrl = getDisplayImageUrl();

  const DESCRIPTION_MAX_LENGTH = 150;
  const needsTruncation = description && description.length > DESCRIPTION_MAX_LENGTH;
  const displayDescription = needsTruncation && !showMore 
    ? description.slice(0, DESCRIPTION_MAX_LENGTH) + '...' 
    : description;

  const handleMediaClick = () => {
    if (mediaType === 'image' && !imageError) {
      setShowFullMedia(true);
    }
  };

  const handleCloseFullMedia = () => {
    setShowFullMedia(false);
  };

  const handleMediaLoad = () => {
    setMediaLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setMediaLoaded(false);
  };

  const toggleShowMore = () => {
    setShowMore(!showMore);
  };

  // Render media based on type
  const renderMedia = () => {
    if (mediaType === 'image') {
      // Check if we can display the image
      const canDisplayImage = !imageError && displayImageUrl;
      
      return (
        <div className="acard-image-wrapper" onClick={handleMediaClick}>
          {canDisplayImage ? (
            <>
              <div className={`acard-image-loader ${mediaLoaded ? 'hidden' : ''}`}>
                <div className="acard-loader-spinner"></div>
              </div>
              <img 
                src={displayImageUrl} 
                alt={title}
                className={`acard-image-content ${mediaLoaded ? 'loaded' : ''}`}
                loading="lazy"
                onLoad={handleMediaLoad}
                onError={handleImageError}
              />
            </>
          ) : (
            <div className="acard-image-error-state">
              <FiAlertCircle className="acard-image-error-icon" />
              <span className="acard-image-error-text">Image not available</span>
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="acard-image-error-link"
              >
                <FiExternalLink /> Open in browser
              </a>
            </div>
          )}
          
          <div className="acard-image-overlay">
            <span>Tap to view full</span>
          </div>
          
          {/* Show image source info */}
          {isUnsplash && (
            <span className="acard-image-source-badge">📸 Unsplash</span>
          )}
          
          {isImageHosting && !isUnsplash && (
            <span className="acard-image-source-badge">📸 Image Host</span>
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
          <div className="acard-video-wrapper">
            <div className="acard-video-placeholder">
              <FiPlay className="acard-video-placeholder-icon" />
              <span className="acard-video-placeholder-text">Video</span>
              <button 
                className="acard-video-link-btn"
                onClick={() => window.open(url, '_blank')}
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
        {/* Header - Removed "Advert" label, now shows just meta info */}
        <div className="acard-header">
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
              <FiExternalLink /> View Content
            </a>
          </div>
        </div>
      </div>

      {/* Full Screen Media Modal */}
      {showFullMedia && mediaType === 'image' && !imageError && (
        <div className="acard-full-modal" onClick={handleCloseFullMedia}>
          <div className="acard-full-container">
            <img 
              src={displayImageUrl} 
              alt={title} 
              className="acard-full-image"
              loading="eager"
              onError={() => {
                // If full image fails, close modal
                setShowFullMedia(false);
              }}
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