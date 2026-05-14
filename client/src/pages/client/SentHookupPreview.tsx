import { FaPaperPlane, FaCheckCircle, FaClock, FaUser, FaTimesCircle } from 'react-icons/fa';
import './senthookuppreview.css'

interface Hookup {
  id: number;
  receiver_name: string;
  receiver_image?: string | null;
  message: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  is_read_by_current_user: boolean;
}

interface SentHookupPreviewProps {
  hookup: Hookup;
  onClick: () => void;
}

const SentHookupPreview: React.FC<SentHookupPreviewProps> = ({ hookup, onClick }) => {
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

  const truncateMessage = (text: string | null, maxLength: number = 80) => {
    if (!text) return "No message";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getStatusIcon = () => {
    switch (hookup.approval_status) {
      case 'pending':
        return <FaClock className="shp-status-icon pending" />;
      case 'approved':
        return <FaCheckCircle className="shp-status-icon approved" />;
      case 'rejected':
        return <FaTimesCircle className="shp-status-icon rejected" />;
      default:
        return null;
    }
  };

  const isUnread = !hookup.is_read_by_current_user;

  return (
    <div className={`shp-row ${isUnread ? 'shp-row-unread' : ''}`} onClick={onClick}>
      {isUnread && (
        <div className="shp-new-badge">
          <span className="shp-new-badge-text">NEW</span>
          <span className="shp-new-badge-glow"></span>
        </div>
      )}
      
      <div className="shp-avatar">
        {hookup.receiver_image ? (
          <img src={hookup.receiver_image} alt={hookup.receiver_name} className="shp-avatar-img" />
        ) : (
          <div className="shp-avatar-placeholder">
            <FaUser />
          </div>
        )}
      </div>
      
      <div className="shp-content">
        <div className="shp-row-header">
          <div className="shp-name-section">
            <h4 className="shp-name">To: {hookup.receiver_name}</h4>
            <div className="shp-status">
              {getStatusIcon()}
              <span className={`shp-status-text ${hookup.approval_status}`}>
                {hookup.approval_status === 'pending' && 'Pending'}
                {hookup.approval_status === 'approved' && 'Approved'}
                {hookup.approval_status === 'rejected' && 'Rejected'}
              </span>
            </div>
          </div>
          <span className="shp-time">{formatDate(hookup.created_at)}</span>
        </div>
        
        <div className="shp-message-preview">
          <FaPaperPlane className="shp-message-icon" />
          <p className="shp-message-text">{truncateMessage(hookup.message)}</p>
        </div>
      </div>
    </div>
  );
};

export default SentHookupPreview;