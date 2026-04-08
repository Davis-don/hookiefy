import { FaHeart, FaClock, FaCheck, FaTimes } from 'react-icons/fa';
import './StatusComponents.css';

interface Hookup {
  id: number;
  sender_name: string;
  created_at: string;
}

interface ReceivedPendingStatusProps {
  hookup: Hookup;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}

const ReceivedPendingStatus: React.FC<ReceivedPendingStatusProps> = ({ hookup, onApprove, onReject, isProcessing }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="status-card status-received-pending">
      <div className="status-icon-wrapper">
        <FaHeart className="status-icon" />
      </div>
      <div className="status-content">
        <h4 className="status-title">New Hookup Request! 💕</h4>
        <p className="status-description">
          {hookup.sender_name} wants to connect with you
        </p>
        <div className="status-meta">
          <FaClock className="meta-icon" />
          <span>Received {formatDate(hookup.created_at)}</span>
        </div>
        <div className="status-actions">
          <button 
            className="status-approve-btn" 
            onClick={onApprove}
            disabled={isProcessing}
          >
            <FaCheck />
            Accept Request
          </button>
          <button 
            className="status-reject-btn" 
            onClick={onReject}
            disabled={isProcessing}
          >
            <FaTimes />
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceivedPendingStatus;