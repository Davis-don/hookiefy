import './youractivitypreview.css'
import { usePaymentModalStore } from './store/modalstore'
import type { Activity } from './Youractivity'

interface YouractivitypreviewProps {
  activity: Activity;
  onActivityClick?: () => void;
  onNavigateToSuccessfulConnections?: () => void;
}

function Youractivitypreview({ 
  activity, 
  onActivityClick,
  onNavigateToSuccessfulConnections 
}: YouractivitypreviewProps) {
  // Add safety check for activity
  if (!activity) {
    console.warn('Activity is undefined or null');
    return null;
  }

  const { senderName, senderAvatar, status, time, connection_id, is_read, connected_user_name, connected_user_avatar } = activity;
  const { open: openPaymentModal } = usePaymentModalStore();

  // Debug log to verify connection_id
  console.log('🔍 Activity connection_id:', connection_id);
  console.log('📋 Full activity:', activity);

  // Check if the activity is clickable for payment (only accepted status)
  const isClickableForPayment = status === 'accepted' && !!connection_id;
  const isDeclined = status === 'rejected';
  const isCompleted = status === 'completed';

  // For completed activities, use the connected user's name instead of sender
  const displayName = isCompleted && connected_user_name 
    ? connected_user_name 
    : senderName || 'Unknown User';
  
  const displayAvatar = isCompleted && connected_user_avatar 
    ? connected_user_avatar 
    : senderAvatar || '';

  const handlePreviewClick = () => {
    // Always mark as read if unread, regardless of status
    if (!is_read && onActivityClick) {
      onActivityClick();
      console.log('📖 Marked activity as read:', displayName);
    }

    // If completed, navigate to Successful Connections tab
    if (isCompleted) {
      console.log('🔗 Navigating to Successful Connections tab for:', displayName);
      if (onNavigateToSuccessfulConnections) {
        onNavigateToSuccessfulConnections();
      }
      return;
    }

    // Only open payment modal if accepted and has connection_id
    if (isClickableForPayment && connection_id) {
      try {
        console.log('💳 Opening payment modal for:', displayName);
        console.log('🔑 Connection ID being passed:', connection_id);
        
        // Open the modal with the connection ID
        openPaymentModal(connection_id);
        
        console.log('✅ Payment modal opened successfully');
      } catch (error) {
        console.error('❌ Error opening payment modal:', error);
      }
    } else if (isDeclined) {
      console.log('📖 Declined activity marked as read:', displayName);
    } else {
      console.log('⛔ Activity is not clickable for payment:', {
        isClickableForPayment,
        hasConnectionId: !!connection_id,
        status,
        is_read
      });
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
      return `Click to complete payment and connect with ${displayName || 'user'}`;
    }
    if (status === 'rejected') {
      return `${displayName || 'User'} declined your request`;
    }
    if (status === 'completed') {
      return `Completed with ${displayName || 'user'}`;
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

  return (
    <div 
      className={`overall-your-activity-preview ${isDeclined ? 'your-activity-disabled' : ''} ${!is_read ? 'your-activity-unread' : ''} ${isCompleted ? 'your-activity-completed' : ''}`}
      onClick={handlePreviewClick}
      style={{ cursor: 'pointer' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePreviewClick();
        }
      }}
    >
      <div className="your-activity-avatar-wrapper">
        {displayAvatar ? (
          <img 
            src={displayAvatar} 
            alt={displayName} 
            className="your-activity-avatar" 
            onError={(e) => {
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
        {isDeclined && (
          <div className="your-activity-disabled-badge">
            <span>🔒</span>
          </div>
        )}
        {isClickableForPayment && (
          <div className="your-activity-click-hint">
            <span>Click to pay 💳</span>
          </div>
        )}
        {!is_read && (
          <div className="your-activity-unread-badge">
            <span>●</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Youractivitypreview