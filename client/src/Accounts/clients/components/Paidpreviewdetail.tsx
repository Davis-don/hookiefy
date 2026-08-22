// ============================================================
// Paidpreviewdetail.tsx - Detail modal for paid connection
// ============================================================

import './paidpreviewdetail.css'

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

interface PaidpreviewdetailProps {
  connection: PaidConnectionData | null;
  isOpen: boolean;
  onClose: () => void;
}

function Paidpreviewdetail({ connection, isOpen, onClose }: PaidpreviewdetailProps) {
  if (!isOpen || !connection) return null;

  const { connected_user, status_display, preview_message, created_at, updated_at, user_role, contact_details } = connection;

  // Get initials for avatar
  const getInitials = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // Copy to clipboard - removed unused 'label' parameter
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <>
      {/* Backdrop */}
      <div className="pdd-overlay" onClick={onClose}>
        {/* Modal */}
        <div className="pdd-modal" onClick={(e) => e.stopPropagation()}>
          {/* Close Button */}
          <button className="pdd-close-btn" onClick={onClose}>
            ✕
          </button>

          {/* Header */}
          <div className="pdd-header">
            <div className="pdd-avatar">
              {connected_user.profile_image_url ? (
                <img 
                  src={connected_user.profile_image_url} 
                  alt={connected_user.full_name}
                  className="pdd-avatar-img"
                />
              ) : (
                <div className="pdd-avatar-placeholder">
                  {getInitials(connected_user.full_name)}
                </div>
              )}
            </div>
            <h2 className="pdd-name">{connected_user.full_name}</h2>
            <p className="pdd-role">Connected as <strong>{user_role}</strong></p>
            <span className="pdd-status-badge" style={{ background: getStatusColor(status_display) }}>
              {status_display}
            </span>
          </div>

          {/* Body */}
          <div className="pdd-body">
            {/* Preview Message */}
            <div className="pdd-preview-section">
              <div className="pdd-preview-icon">💬</div>
              <p className="pdd-preview-text">{preview_message}</p>
            </div>

            {/* Contact Details */}
            <div className="pdd-contact-section">
              <h4 className="pdd-section-title">📞 Contact Details</h4>
              
              <div className="pdd-contact-item">
                <div className="pdd-contact-icon">📧</div>
                <div className="pdd-contact-info">
                  <span className="pdd-contact-label">Email</span>
                  <span className="pdd-contact-value">{contact_details.email}</span>
                </div>
                <button 
                  className="pdd-copy-btn"
                  onClick={() => copyToClipboard(contact_details.email)}
                >
                  Copy
                </button>
              </div>

              <div className="pdd-contact-item">
                <div className="pdd-contact-icon">📱</div>
                <div className="pdd-contact-info">
                  <span className="pdd-contact-label">Phone</span>
                  <span className="pdd-contact-value">{contact_details.phone_number}</span>
                </div>
                <button 
                  className="pdd-copy-btn"
                  onClick={() => copyToClipboard(contact_details.phone_number)}
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Connection Info */}
            <div className="pdd-info-section">
              <h4 className="pdd-section-title">📋 Connection Info</h4>
              
              <div className="pdd-info-grid">
                <div className="pdd-info-item">
                  <span className="pdd-info-label">Connection ID</span>
                  <span className="pdd-info-value">{connection.connection_id.slice(0, 8)}...</span>
                </div>
                <div className="pdd-info-item">
                  <span className="pdd-info-label">Created</span>
                  <span className="pdd-info-value">{formatDate(created_at)}</span>
                </div>
                <div className="pdd-info-item">
                  <span className="pdd-info-label">Updated</span>
                  <span className="pdd-info-value">{formatDate(updated_at)}</span>
                </div>
                <div className="pdd-info-item">
                  <span className="pdd-info-label">Time</span>
                  <span className="pdd-info-value">{formatTime(created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pdd-footer">
            <button className="pdd-close-btn-bottom" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Paidpreviewdetail