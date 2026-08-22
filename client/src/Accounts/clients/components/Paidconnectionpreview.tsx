// ============================================================
// Paidconnectionpreview.tsx - Simple one-line preview card
// ============================================================

import './paidconnectionpreview.css'

interface ConnectedUser {
  id: number;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: string;
  profile_image_url: string | null;
  has_profile_image: boolean;
}

interface ContactDetails {
  phone_number: string;
  email: string;
  full_name: string;
}

interface PaidConnectionData {
  connection_id: string;
  status: string;
  status_display: string;
  created_at: string;
  updated_at: string;
  user_role: string;
  connected_user: ConnectedUser;
  preview_message: string;
  contact_details: ContactDetails;
}

interface PaidconnectionpreviewProps {
  connection: PaidConnectionData;
  onViewDetails: () => void;
}

function Paidconnectionpreview({ connection, onViewDetails }: PaidconnectionpreviewProps) {
  const { connected_user, status_display, preview_message } = connection;

  // Get initials for avatar
  const getInitials = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'completed':
        return '#22c55e';
      case 'pending':
        return '#fbbf24';
      case 'accepted':
        return '#3b82f6';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div 
      className="pcp-preview-card"
      onClick={onViewDetails}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onViewDetails();
        }
      }}
    >
      <div className="pcp-preview-avatar">
        {connected_user.profile_image_url ? (
          <img 
            src={connected_user.profile_image_url} 
            alt={connected_user.full_name}
            className="pcp-preview-avatar-img"
          />
        ) : (
          <div className="pcp-preview-avatar-placeholder">
            {getInitials(connected_user.full_name)}
          </div>
        )}
      </div>
      
      <div className="pcp-preview-content">
        <div className="pcp-preview-name">
          <strong>{connected_user.full_name}</strong>
          <span className="pcp-preview-status-badge" style={{ color: getStatusColor(status_display) }}>
            ● {status_display}
          </span>
        </div>
        <div className="pcp-preview-message">
          {preview_message}
        </div>
      </div>

      <div className="pcp-preview-arrow">
        <span>→</span>
      </div>
    </div>
  )
}

export default Paidconnectionpreview