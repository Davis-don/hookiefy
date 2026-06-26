import './postcard.css'
import { useState } from 'react';

interface PostcardProps {
  id: string;
  firstName: string;
  lastName: string;
  time: string;
  location: string;
  image: string;
  caption: string;
}

function Postcard({ id, firstName, lastName, time, location, image, caption }: PostcardProps) {
  const [message, setMessage] = useState('');
  const [showFullImage, setShowFullImage] = useState(false);

  const fullName = `${firstName} ${lastName}`;
  const avatarUrl = `https://i.pravatar.cc/150?img=${parseInt(id) + 10}`;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      console.log(`Message to ${fullName}: ${message}`);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) {
        console.log(`Message to ${fullName}: ${message}`);
        setMessage('');
      }
    }
  };

  const handleImageClick = () => {
    setShowFullImage(true);
  };

  const handleCloseFullImage = () => {
    setShowFullImage(false);
  };

  return (
    <>
      <div className="overall-post-card-container">
        {/* Post Header */}
        <div className="post-header">
          <img 
            src={avatarUrl} 
            alt={fullName} 
            className="post-avatar-img" 
          />
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

        {/* Post Image - Clickable */}
        <div className="post-image-wrapper" onClick={handleImageClick}>
          <img 
            src={image} 
            alt={caption} 
            className="post-image-content" 
            loading="lazy"
          />
          <div className="post-image-overlay">
            <span>Tap to view full</span>
          </div>
        </div>

        {/* Post Caption */}
        <div className="post-caption">
          <strong>{fullName}</strong> {caption}
        </div>

        {/* Message Input - Form */}
        <form className="post-comment-input" onSubmit={handleSendMessage}>
          <input 
            type="text" 
            placeholder="Send a message or request hookup..." 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button type="submit">Send</button>
        </form>
      </div>

      {/* Full Screen Image Modal */}
      {showFullImage && (
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