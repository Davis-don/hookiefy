import './youractivitypreview.css'
import type { YourActivity } from './data/youractivity'

interface YouractivitypreviewProps {
  activity: YourActivity;
  onClick: () => void;
}

function Youractivitypreview({ activity, onClick }: YouractivitypreviewProps) {
  const { senderName, senderAvatar, status, respondedAt } = activity;

  const getStatusIcon = () => {
    if (status === 'accepted') {
      return '✅';
    }
    if (status === 'declined') {
      return '❌';
    }
    return '⏳';
  };

  const getStatusText = () => {
    if (status === 'accepted') {
      return 'Accepted';
    }
    if (status === 'declined') {
      return 'Declined';
    }
    return 'Pending';
  };

  const getStatusColor = () => {
    if (status === 'accepted') {
      return '#22c55e';
    }
    if (status === 'declined') {
      return '#ef4444';
    }
    return '#f59e0b';
  };

  const getStatusMessage = () => {
    if (status === 'accepted') {
      return 'Complete the hookup request';
    }
    if (status === 'declined') {
      return 'You declined this request';
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
    if (status === 'declined') {
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
    <div className="overall-your-activity-preview" onClick={onClick}>
      <div className="your-activity-avatar-wrapper">
        <img 
          src={senderAvatar} 
          alt={senderName} 
          className="your-activity-avatar" 
        />
        <div 
          className="your-activity-status-dot"
          style={{ background: getStatusColor() }}
        ></div>
      </div>
      
      <div className="your-activity-content">
        <div className="your-activity-message">
          <span className="your-activity-message-text">
            <strong>{senderName}</strong> 
            <span className="your-activity-status-badge" style={{ color: getStatusColor() }}>
              {getStatusIcon()} {getStatusText()}
            </span>
          </span>
        </div>
        <div className="your-activity-status-message">
          {getStatusMessage()}
        </div>
        <div className="your-activity-time">
          Responded {respondedAt}
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
      </div>
    </div>
  )
}

export default Youractivitypreview