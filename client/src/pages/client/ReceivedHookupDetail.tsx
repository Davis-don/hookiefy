import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaTimes, FaHeart, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaUser, FaHeartBroken } from 'react-icons/fa';
import { toast } from '../../store/Toaststore';
import ReceivedPendingStatus from './ReceivedPendingStatus';
import ReceivedApprovedStatus from './ReceivedApprovedStatus';
import ReceivedPaidStatus from './ReceivedPaidStatus';
import RejectedStatus from './RejectedStatus';
import './receivedhookupdetail.css';

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

interface ReceivedHookupDetailProps {
  hookup: Hookup;
  onClose: () => void;
  onRefresh: () => void;
}

const ReceivedHookupDetail: React.FC<ReceivedHookupDetailProps> = ({ hookup, onClose, onRefresh }) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const queryClient = useQueryClient();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isActionProcessing, setIsActionProcessing] = useState(false);

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

  const approveMutation = useMutation({
    mutationFn: async () => {
      setIsActionProcessing(true);
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookup.id}/approve/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success(`You approved ${hookup.sender_name}'s request!`, {
        title: '✓ Request Approved',
        icon: '💚',
        duration: 4000,
      });
      queryClient.invalidateQueries({ queryKey: ['my-hookups'] });
      onRefresh();
      onClose();
    },
    onError: () => {
      toast.error('Failed to approve request', {
        title: '❌ Error',
        icon: '💔',
        duration: 3000,
      });
      setIsActionProcessing(false);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      setIsActionProcessing(true);
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookup.id}/reject/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.info(`You declined ${hookup.sender_name}'s request`, {
        title: '✗ Request Declined',
        icon: '💔',
        duration: 4000,
      });
      queryClient.invalidateQueries({ queryKey: ['my-hookups'] });
      onRefresh();
      onClose();
    },
    onError: () => {
      toast.error('Failed to decline request', {
        title: '❌ Error',
        icon: '💔',
        duration: 3000,
      });
      setIsActionProcessing(false);
      setShowRejectModal(false);
    },
  });

  const handleApprove = () => {
    approveMutation.mutate();
  };

  const handleRejectClick = () => {
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    setShowRejectModal(false);
    rejectMutation.mutate();
  };

  const handleCancelReject = () => {
    setShowRejectModal(false);
  };

  const renderStatusComponent = () => {
    if (hookup.approval_status === 'pending') {
      return (
        <ReceivedPendingStatus 
          hookup={hookup} 
          onApprove={handleApprove}
          onReject={handleRejectClick}
          isProcessing={isActionProcessing}
        />
      );
    } else if (hookup.approval_status === 'approved') {
      if (hookup.is_paid) {
        return <ReceivedPaidStatus hookup={hookup} />;
      }
      return <ReceivedApprovedStatus hookup={hookup} />;
    } else if (hookup.approval_status === 'rejected') {
      return <RejectedStatus hookup={hookup} />;
    }
    return null;
  };

  return (
    <>
      <div className="rhd-overlay" onClick={onClose}>
        <div className="rhd-modal" onClick={(e) => e.stopPropagation()}>
          <button className="rhd-close" onClick={onClose}>
            <FaTimes />
          </button>

          <div className="rhd-header">
            <div className="rhd-avatar">
              {hookup.sender_image ? (
                <img src={hookup.sender_image} alt={hookup.sender_name} />
              ) : (
                <div className="rhd-avatar-placeholder">
                  <FaUser />
                </div>
              )}
            </div>
            <div className="rhd-header-info">
              <h2>{hookup.sender_name}</h2>
              <p className="rhd-relation">Sent you a hookup request</p>
              {renderStatusComponent()}
            </div>
          </div>

          <div className="rhd-content">
            {hookup.message && (
              <div className="rhd-section">
                <div className="rhd-section-header">
                  <FaHeart className="rhd-section-icon" />
                  <h3>Message from {hookup.sender_name}</h3>
                </div>
                <div className="rhd-message-box">
                  <p className="rhd-message">"{hookup.message}"</p>
                </div>
              </div>
            )}

            <div className="rhd-details-grid">
              {hookup.location && (
                <div className="rhd-detail-card">
                  <FaMapMarkerAlt className="rhd-detail-icon" />
                  <div className="rhd-detail-info">
                    <span className="rhd-detail-label">Suggested Location</span>
                    <span className="rhd-detail-value">{hookup.location}</span>
                  </div>
                </div>
              )}

              {hookup.scheduled_time && (
                <div className="rhd-detail-card">
                  <FaCalendarAlt className="rhd-detail-icon" />
                  <div className="rhd-detail-info">
                    <span className="rhd-detail-label">Suggested Time</span>
                    <span className="rhd-detail-value">{formatFullDate(hookup.scheduled_time)}</span>
                  </div>
                </div>
              )}

              <div className="rhd-detail-card">
                <FaClock className="rhd-detail-icon" />
                <div className="rhd-detail-info">
                  <span className="rhd-detail-label">Received Date</span>
                  <span className="rhd-detail-value">{formatFullDate(hookup.created_at)}</span>
                </div>
              </div>
            </div>

            {(hookup.approved_at || hookup.rejected_at || hookup.paid_at) && (
              <div className="rhd-section">
                <div className="rhd-section-header">
                  <FaClock className="rhd-section-icon" />
                  <h3>Timeline</h3>
                </div>
                <div className="rhd-timeline">
                  {hookup.approved_at && (
                    <div className="rhd-timeline-item approved">
                      <div className="rhd-timeline-dot"></div>
                      <div className="rhd-timeline-content">
                        <span className="rhd-timeline-title">You Approved</span>
                        <span className="rhd-timeline-date">{formatFullDate(hookup.approved_at)}</span>
                      </div>
                    </div>
                  )}
                  {hookup.rejected_at && (
                    <div className="rhd-timeline-item rejected">
                      <div className="rhd-timeline-dot"></div>
                      <div className="rhd-timeline-content">
                        <span className="rhd-timeline-title">You Declined</span>
                        <span className="rhd-timeline-date">{formatFullDate(hookup.rejected_at)}</span>
                      </div>
                    </div>
                  )}
                  {hookup.paid_at && (
                    <div className="rhd-timeline-item paid">
                      <div className="rhd-timeline-dot"></div>
                      <div className="rhd-timeline-content">
                        <span className="rhd-timeline-title">Payment Completed</span>
                        <span className="rhd-timeline-date">{formatFullDate(hookup.paid_at)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Reject Confirmation Modal */}
      {showRejectModal && (
        <div className="delete-modal-overlay" onClick={handleCancelReject}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <button className="delete-modal-close" onClick={handleCancelReject}>
              <FaTimes />
            </button>
            <div className="delete-modal-icon">
              <FaHeartBroken />
            </div>
            <h3 className="delete-modal-title">Decline Request? 💔</h3>
            <p className="delete-modal-message">
              Are you sure you want to decline <strong>{hookup.sender_name}</strong>'s hookup request?
            </p>
            <p className="delete-modal-warning">
              This action cannot be undone. They will be notified that you declined.
            </p>
            <div className="delete-modal-actions">
              <button className="delete-modal-cancel-btn" onClick={handleCancelReject}>
                Keep Request
              </button>
              <button className="delete-modal-confirm-btn" onClick={handleConfirmReject} disabled={isActionProcessing}>
                {isActionProcessing ? 'Declining...' : 'Yes, Decline Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReceivedHookupDetail;