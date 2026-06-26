import './connectionrequestpreview.css'
import type { ConnectionRequest } from './data/connectionrequest'

interface ConnectionrequestpreviewProps {
  request: ConnectionRequest;
  onClick: () => void;
}

function Connectionrequestpreview({ request, onClick }: ConnectionrequestpreviewProps) {
  const { senderName, senderAvatar, time } = request;

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    alert(`Accepted request from ${senderName}`);
    // Add your accept logic here
  };

  const handleDecline = (e: React.MouseEvent) => {
    e.stopPropagation();
    alert(`Declined request from ${senderName}`);
    // Add your decline logic here
  };

  return (
    <div className="overall-conection-requst-preview" onClick={onClick}>
      <div className="conn-req-avatar-wrapper">
        <img 
          src={senderAvatar} 
          alt={senderName} 
          className="conn-req-avatar" 
        />
        <div className="conn-req-status-dot"></div>
      </div>
      
      <div className="conn-req-content">
        <div className="conn-req-message">
          <span className="conn-req-message-text">
            <strong>{senderName}</strong> sent you a hookup request
          </span>
        </div>
        <div className="conn-req-time">{time}</div>
      </div>

      <div className="conn-req-actions">
        <button 
          className="conn-req-action-btn conn-req-accept-btn"
          onClick={handleAccept}
        >
          Accept
        </button>
        <button 
          className="conn-req-action-btn conn-req-decline-btn"
          onClick={handleDecline}
        >
          Decline
        </button>
      </div>
    </div>
  )
}

export default Connectionrequestpreview