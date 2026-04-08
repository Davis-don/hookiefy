import { FaHourglassHalf, FaClock, FaBell } from 'react-icons/fa';
import './StatusComponents.css';

interface Hookup {
  id: number;
  approval_status: string;
  created_at: string;
}

interface PendingStatusProps {
  hookup: Hookup;
}

const PendingStatus: React.FC<PendingStatusProps> = ({ hookup }) => {
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
    <div className="status-card status-pending">
      <div className="status-icon-wrapper">
        <FaHourglassHalf className="status-icon" />
      </div>
      <div className="status-content">
        <h4 className="status-title">Waiting for Response</h4>
        <p className="status-description">
          Your hookup request is waiting for a response
        </p>
        <div className="status-meta">
          <FaClock className="meta-icon" />
          <span>Sent {formatDate(hookup.created_at)}</span>
        </div>
        <div className="status-loading">
          <div className="loading-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
          <span className="loading-text">Waiting for response...</span>
        </div>
        <div className="status-tip">
          <FaBell className="tip-icon" />
          <span>You'll be notified when they respond</span>
        </div>
      </div>
    </div>
  );
};

export default PendingStatus;