import { FaHeart, FaUser } from 'react-icons/fa';
import './receivedhookuppreview.css'

interface Hookup {
  id: number;
  sender_name: string;
  sender_image?: string | null;
  message: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  is_read_by_current_user: boolean;
}

interface ReceivedHookupPreviewProps {
  hookup: Hookup;
  onClick: () => void;
}

const ReceivedHookupPreview: React.FC<ReceivedHookupPreviewProps> = ({ hookup, onClick }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const truncateMessage = (text: string | null, maxLength: number = 60) => {
    if (!text) return "Sent you a hookup request";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const isUnread = !hookup.is_read_by_current_user;

  return (
    <div className={`rhp-row ${isUnread ? 'rhp-row-unread' : ''}`} onClick={onClick}>
      {isUnread && (
        <div className="rhp-new-badge">
          <span className="rhp-new-badge-text">NEW</span>
          <span className="rhp-new-badge-glow"></span>
        </div>
      )}
      
      <div className="rhp-avatar">
        {hookup.sender_image ? (
          <img src={hookup.sender_image} alt={hookup.sender_name} className="rhp-avatar-img" />
        ) : (
          <div className="rhp-avatar-placeholder">
            <FaUser />
          </div>
        )}
      </div>
      
      <div className="rhp-content">
        <div className="rhp-row-header">
          <div className="rhp-name-section">
            <h4 className="rhp-name">{hookup.sender_name}</h4>
            {hookup.approval_status === 'pending' && (
              <span className="rhp-request-badge">
                <FaHeart className="rhp-heart-icon" />
                wants to connect
              </span>
            )}
          </div>
          <span className="rhp-time">{formatDate(hookup.created_at)}</span>
        </div>
        
        <div className="rhp-message-preview">
          <p className="rhp-message-text">💬 {truncateMessage(hookup.message)}</p>
        </div>
      </div>
    </div>
  );
};

export default ReceivedHookupPreview;