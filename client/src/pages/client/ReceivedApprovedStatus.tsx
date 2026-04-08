import { FaCheckCircle, FaClock } from 'react-icons/fa';
import './StatusComponents.css';

interface Hookup {
  id: number;
  sender_name: string;
  approved_at: string | null;
}

interface ReceivedApprovedStatusProps {
  hookup: Hookup;
}

const ReceivedApprovedStatus: React.FC<ReceivedApprovedStatusProps> = ({ hookup }) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="status-card status-received-approved">
      <div className="status-icon-wrapper">
        <FaCheckCircle className="status-icon" />
      </div>
      <div className="status-content">
        <h4 className="status-title">Request Approved! ✓</h4>
        <p className="status-description">
          You accepted {hookup.sender_name}'s request. Waiting for them to complete payment.
        </p>
        <div className="status-meta">
          <FaClock className="meta-icon" />
          <span>Approved on {formatDate(hookup.approved_at)}</span>
        </div>
        <div className="status-loading">
          <div className="loading-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
          <span className="loading-text">Waiting for sender to complete payment...</span>
        </div>
      </div>
    </div>
  );
};

export default ReceivedApprovedStatus;