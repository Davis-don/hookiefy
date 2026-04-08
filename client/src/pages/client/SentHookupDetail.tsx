import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaTimes, FaPaperPlane, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaUser, FaTrash, FaHeartBroken } from 'react-icons/fa';
import { toast } from '../../store/Toaststore';
import PendingStatus from './PendingStatus';
import ApprovedStatus from './ApprovedStatus';
import RejectedStatus from './RejectedStatus';
import PaidStatus from './PaidStatus';
import './senthookupdetail.css';

interface Hookup {
  id: number;
  sender_id: number;
  receiver_id: number;
  sender_name: string;
  receiver_name: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  payment_status: 'paid' | 'not_paid';
  is_paid: boolean;
  message: string | null;
  location: string | null;
  scheduled_time: string | null;
  is_read_by_sender: boolean;
  is_read_by_receiver: boolean;
  is_deleted_by_sender: boolean;
  is_deleted_by_receiver: boolean;
  is_read_by_current_user: boolean;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  paid_at: string | null;
  role?: 'sent' | 'received';
  sender_image?: string | null;
  receiver_image?: string | null;
}

interface SentHookupDetailProps {
  hookup: Hookup;
  onClose: () => void;
  onRefresh: () => void;
}

const SentHookupDetail: React.FC<SentHookupDetailProps> = ({ hookup, onClose, onRefresh }) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const formatFullDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      setIsDeleting(true);
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookup.id}/delete/`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Hookup request deleted', {
        title: '🗑️ Deleted',
        icon: '✓',
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ['my-hookups'] });
      onRefresh();
      onClose();
    },
    onError: () => {
      toast.error('Failed to delete hookup', {
        title: '❌ Error',
        icon: '💔',
        duration: 3000,
      });
      setIsDeleting(false);
      setShowDeleteModal(false);
    },
  });

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    deleteMutation.mutate();
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const renderStatusComponent = () => {
    if (hookup.approval_status === 'pending') {
      return <PendingStatus hookup={hookup} />;
    } else if (hookup.approval_status === 'approved') {
      if (hookup.is_paid) {
        return <PaidStatus hookup={hookup} />;
      }
      return <ApprovedStatus hookup={hookup} />;
    } else if (hookup.approval_status === 'rejected') {
      return <RejectedStatus hookup={hookup} />;
    }
    return null;
  };

  return (
    <>
      <div className="shd-overlay" onClick={onClose}>
        <div className="shd-modal" onClick={(e) => e.stopPropagation()}>
          <button className="shd-close" onClick={onClose}>
            <FaTimes />
          </button>

          <div className="shd-header">
            <div className="shd-avatar">
              {hookup.receiver_image ? (
                <img src={hookup.receiver_image} alt={hookup.receiver_name} />
              ) : (
                <div className="shd-avatar-placeholder">
                  <FaUser />
                </div>
              )}
            </div>
            <div className="shd-header-info">
              <h2>{hookup.receiver_name}</h2>
              <p className="shd-relation">You sent a request to</p>
              {renderStatusComponent()}
            </div>
          </div>

          <div className="shd-content">
            {/* Message Section */}
            <div className="shd-section">
              <div className="shd-section-header">
                <FaPaperPlane className="shd-section-icon" />
                <h3>Your Message</h3>
              </div>
              <div className="shd-message-box">
                <p className="shd-message">{hookup.message || 'No message provided'}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="shd-details-grid">
              {hookup.location && (
                <div className="shd-detail-card">
                  <FaMapMarkerAlt className="shd-detail-icon" />
                  <div className="shd-detail-info">
                    <span className="shd-detail-label">Location</span>
                    <span className="shd-detail-value">{hookup.location}</span>
                  </div>
                </div>
              )}

              {hookup.scheduled_time && (
                <div className="shd-detail-card">
                  <FaCalendarAlt className="shd-detail-icon" />
                  <div className="shd-detail-info">
                    <span className="shd-detail-label">Scheduled Time</span>
                    <span className="shd-detail-value">{formatFullDate(hookup.scheduled_time)}</span>
                  </div>
                </div>
              )}

              <div className="shd-detail-card">
                <FaClock className="shd-detail-icon" />
                <div className="shd-detail-info">
                  <span className="shd-detail-label">Sent Date</span>
                  <span className="shd-detail-value">{formatFullDate(hookup.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Timeline Section */}
            {(hookup.approved_at || hookup.rejected_at || hookup.paid_at) && (
              <div className="shd-section">
                <div className="shd-section-header">
                  <FaClock className="shd-section-icon" />
                  <h3>Timeline</h3>
                </div>
                <div className="shd-timeline">
                  {hookup.approved_at && (
                    <div className="shd-timeline-item approved">
                      <div className="shd-timeline-dot"></div>
                      <div className="shd-timeline-content">
                        <span className="shd-timeline-title">Approved</span>
                        <span className="shd-timeline-date">{formatFullDate(hookup.approved_at)}</span>
                      </div>
                    </div>
                  )}
                  {hookup.rejected_at && (
                    <div className="shd-timeline-item rejected">
                      <div className="shd-timeline-dot"></div>
                      <div className="shd-timeline-content">
                        <span className="shd-timeline-title">Rejected</span>
                        <span className="shd-timeline-date">{formatFullDate(hookup.rejected_at)}</span>
                      </div>
                    </div>
                  )}
                  {hookup.paid_at && (
                    <div className="shd-timeline-item paid">
                      <div className="shd-timeline-dot"></div>
                      <div className="shd-timeline-content">
                        <span className="shd-timeline-title">Payment Completed</span>
                        <span className="shd-timeline-date">{formatFullDate(hookup.paid_at)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="shd-actions">
            {hookup.approval_status === 'pending' && (
              <button className="shd-delete-btn" onClick={handleDeleteClick} disabled={isDeleting}>
                <FaTrash />
                Cancel Request
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="delete-modal-overlay" onClick={handleCancelDelete}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <button className="delete-modal-close" onClick={handleCancelDelete}>
              <FaTimes />
            </button>
            <div className="delete-modal-icon">
              <FaHeartBroken />
            </div>
            <h3 className="delete-modal-title">Cancel Request? 💔</h3>
            <p className="delete-modal-message">
              Are you sure you want to cancel your hookup request to <strong>{hookup.receiver_name}</strong>?
            </p>
            <p className="delete-modal-warning">
              This action cannot be undone. You'll need to send a new request if you change your mind.
            </p>
            <div className="delete-modal-actions">
              <button className="delete-modal-cancel-btn" onClick={handleCancelDelete}>
                Keep Request
              </button>
              <button className="delete-modal-confirm-btn" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Canceling...' : 'Yes, Cancel Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SentHookupDetail;