import './youractivitypreview.css'
import { usePaymentModalStore } from './store/modalstore'
import type { Activity } from './Youractivity'

interface YouractivitypreviewProps {
  activity: Activity;
}

function Youractivitypreview({ activity }: YouractivitypreviewProps) {
  // Add safety check for activity
  if (!activity) {
    console.warn('Activity is undefined or null');
    return null;
  }

  const { senderName, senderAvatar, status, time, connection_id } = activity;
  const { open: openPaymentModal } = usePaymentModalStore();

  // Check if the activity is clickable (only accepted status is clickable)
  const isClickable = status === 'accepted';
  const isDisabled = status === 'rejected' || status === 'completed';

  const handlePreviewClick = () => {
    if (isClickable && connection_id) {
      try {
        console.log('💳 Opening payment modal for:', senderName);
        openPaymentModal(connection_id);
      } catch (error) {
        console.error('Error opening payment modal:', error);
      }
    }
  };

  const getStatusIcon = () => {
    if (status === 'accepted') {
      return '✅';
    }
    if (status === 'rejected') {
      return '❌';
    }
    if (status === 'completed') {
      return '✅';
    }
    return '⏳';
  };

  const getStatusText = () => {
    if (status === 'accepted') {
      return 'Accepted';
    }
    if (status === 'rejected') {
      return 'Declined';
    }
    if (status === 'completed') {
      return 'Completed';
    }
    return 'Pending';
  };

  const getStatusColor = () => {
    if (status === 'accepted') {
      return '#22c55e';
    }
    if (status === 'rejected') {
      return '#ef4444';
    }
    if (status === 'completed') {
      return '#3b82f6';
    }
    return '#f59e0b';
  };

  const getStatusMessage = () => {
    if (status === 'accepted') {
      return `Click to complete payment and connect with ${senderName || 'user'}`;
    }
    if (status === 'rejected') {
      return `${senderName || 'User'} declined your request`;
    }
    if (status === 'completed') {
      return `Completed with ${senderName || 'user'}`;
    }
    return 'Waiting for response';
  };

  const getProgressDots = () => {
    if (status === 'accepted') {
      return (
        <div className="your-activity-progress-dots">
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
          <span className="your-activity-dot your-activity-dot-accepted-active"></span>
          <span className="your-activity-dot your-activity-dot-accepted-inactive"></span>
        </div>
      );
    }
    if (status === 'rejected') {
      return (
        <div className="your-activity-progress-dots">
          <span className="your-activity-dot your-activity-dot-declined-completed"></span>
          <span className="your-activity-dot your-activity-dot-declined"></span>
          <span className="your-activity-dot your-activity-dot-declined-inactive"></span>
          <span className="your-activity-dot your-activity-dot-declined-inactive"></span>
          <span className="your-activity-dot your-activity-dot-declined-inactive"></span>
        </div>
      );
    }
    if (status === 'completed') {
      return (
        <div className="your-activity-progress-dots">
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
        </div>
      );
    }
    return (
      <div className="your-activity-progress-dots">
        <span className="your-activity-dot your-activity-dot-pending-completed"></span>
        <span className="your-activity-dot your-activity-dot-pending-active"></span>
        <span className="your-activity-dot your-activity-dot-pending-inactive"></span>
        <span className="your-activity-dot your-activity-dot-pending-inactive"></span>
        <span className="your-activity-dot your-activity-dot-pending-inactive"></span>
      </div>
    );
  };

  // Safety check for missing data
  const displayName = senderName || 'Unknown User';
  const displayAvatar = senderAvatar || '';

  return (
    <div 
      className={`overall-your-activity-preview ${!isClickable ? 'your-activity-disabled' : ''}`}
      onClick={handlePreviewClick}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
    >
      <div className="your-activity-avatar-wrapper">
        {displayAvatar ? (
          <img 
            src={displayAvatar} 
            alt={displayName} 
            className="your-activity-avatar" 
            onError={(e) => {
              // Handle image loading errors
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="your-activity-avatar-fallback">
            <span>{displayName.charAt(0).toUpperCase() || 'U'}</span>
          </div>
        )}
        <div 
          className="your-activity-status-dot"
          style={{ background: getStatusColor() }}
        ></div>
      </div>
      
      <div className="your-activity-content">
        <div className="your-activity-message">
          <span className="your-activity-message-text">
            <strong>{displayName}</strong> 
            <span className="your-activity-status-badge" style={{ color: getStatusColor() }}>
              {getStatusIcon()} {getStatusText()}
            </span>
          </span>
        </div>
        <div className="your-activity-status-message">
          {getStatusMessage()}
        </div>
        <div className="your-activity-time">
          {time || 'Just now'}
        </div>
      </div>

      <div className="your-activity-right-section">
        <div className="your-activity-progress-section">
          {getProgressDots()}
        </div>
        <div className="your-activity-status-label">
          <span style={{ color: getStatusColor() }}>
            {getStatusText().toUpperCase()}
          </span>
        </div>
        {isDisabled && (
          <div className="your-activity-disabled-badge">
            <span>🔒</span>
          </div>
        )}
        {isClickable && (
          <div className="your-activity-click-hint">
            <span>Click to pay 💳</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Youractivitypreview