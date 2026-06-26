import './connectionrequestdetail.css'
import { usePreviewStore } from './store/connectpreview'
import { connectionRequests } from './data/connectionrequest'
import { useState } from 'react'

function Connectionrequestdetail() {
  const { id, closePreview } = usePreviewStore();
  const [isProcessing, setIsProcessing] = useState(false);

  // Find the sender data based on the ID from store
  const senderData = connectionRequests.find(req => req.senderId === id);

  // If no data found, show a fallback
  if (!senderData) {
    return (
      <div className="overall-conection-request-detail">
        <div className="conn-req-detail-back" onClick={closePreview}>
          <span className="conn-req-detail-back-icon">←</span>
          <span className="conn-req-detail-back-text">Back</span>
        </div>
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem 1rem',
          color: 'rgba(255,255,255,0.5)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
          <p>User not found</p>
        </div>
      </div>
    );
  }

  const handleAccept = async () => {
    setIsProcessing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`✅ Accepted connection request from ${senderData.senderName}`);
    setIsProcessing(false);
    closePreview(); // Close the detail view and clear the store
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`❌ Declined connection request from ${senderData.senderName}`);
    setIsProcessing(false);
    closePreview(); // Close the detail view and clear the store
  };

  // Generate random profile data for demo purposes
  const profileData = {
    location: ["Nairobi, Kenya", "Mombasa, Kenya", "Kisumu, Kenya", "Nakuru, Kenya", "Eldoret, Kenya", "Naivasha, Kenya"][Math.floor(Math.random() * 6)],
    bio: "Adventurer, coffee lover, and sunset chaser. Always looking for new connections and memorable experiences.",
    lookingFor: "I'm looking for genuine connections, meaningful conversations, and someone to share adventures with. Open to friendships, dating, or just good vibes.",
    mutualFriends: Math.floor(Math.random() * 12),
    interests: ["Travel", "Photography", "Music", "Food", "Nature", "Fitness"]
  };

  return (
    <div className="overall-conection-request-detail">
      {/* Back Button */}
      <div className="conn-req-detail-back" onClick={closePreview}>
        <span className="conn-req-detail-back-icon">←</span>
        <span className="conn-req-detail-back-text">Back</span>
      </div>

      {/* Profile Header */}
      <div className="conn-req-detail-profile">
        <img 
          src={senderData.senderAvatar} 
          alt={senderData.senderName} 
          className="conn-req-detail-avatar" 
        />
        <h2 className="conn-req-detail-name">{senderData.senderName}</h2>
        <div className="conn-req-detail-handle">@{senderData.senderName.toLowerCase().replace(' ', '_')}</div>
        <div className="conn-req-detail-location">
          <span className="conn-req-detail-location-icon">📍</span>
          <span>{profileData.location}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="conn-req-detail-stats">
        <div className="conn-req-detail-stat">
          <span className="conn-req-detail-stat-number">{profileData.mutualFriends}</span>
          <span className="conn-req-detail-stat-label">Mutual Friends</span>
        </div>
        <div className="conn-req-detail-stat">
          <span className="conn-req-detail-stat-number">{profileData.interests.length}</span>
          <span className="conn-req-detail-stat-label">Interests</span>
        </div>
        <div className="conn-req-detail-stat">
          <span className="conn-req-detail-stat-number">1</span>
          <span className="conn-req-detail-stat-label">Request</span>
        </div>
      </div>

      {/* Bio Section */}
      <div className="conn-req-detail-bio">
        <div className="conn-req-detail-bio-title">About</div>
        <div className="conn-req-detail-bio-text">{profileData.bio}</div>
      </div>

      {/* Looking For Section */}
      <div className="conn-req-detail-looking">
        <div className="conn-req-detail-looking-title">Looking For</div>
        <div className="conn-req-detail-looking-text">{profileData.lookingFor}</div>
      </div>

      {/* Interests Section */}
      <div className="conn-req-detail-interests">
        <div className="conn-req-detail-interests-title">Interests</div>
        <div className="conn-req-detail-interests-tags">
          {profileData.interests.map((interest, index) => (
            <span key={index} className="conn-req-detail-interest-tag">{interest}</span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="conn-req-detail-actions">
        <button 
          className="conn-req-detail-btn conn-req-detail-btn-decline"
          onClick={handleDecline}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Decline'}
        </button>
        <button 
          className="conn-req-detail-btn conn-req-detail-btn-accept"
          onClick={handleAccept}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Accept'}
        </button>
      </div>

      {/* Message from sender */}
      <div className="conn-req-detail-message">
        <div className="conn-req-detail-message-title">Message</div>
        <div className="conn-req-detail-message-text">"{senderData.message}"</div>
        <div className="conn-req-detail-message-time">Sent {senderData.time}</div>
      </div>
    </div>
  )
}

export default Connectionrequestdetail