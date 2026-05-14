import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaTimes } from 'react-icons/fa';
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
          
          {/* Only the status component - it handles everything */}
          {renderStatusComponent()}
        </div>
      </div>

      {/* Centered Reject Confirmation Modal */}
      {showRejectModal && (
        <div className="rhd-reject-modal-overlay" onClick={handleCancelReject}>
          <div className="rhd-reject-modal" onClick={(e) => e.stopPropagation()}>
            <button className="rhd-reject-modal-close" onClick={handleCancelReject}>
              <FaTimes />
            </button>
            <div className="rhd-reject-modal-icon">💔</div>
            <h3 className="rhd-reject-modal-title">Decline Request?</h3>
            <p className="rhd-reject-modal-message">
              Are you sure you want to decline <strong>{hookup.sender_name}</strong>'s hookup request?
            </p>
            <p className="rhd-reject-modal-warning">
              This action cannot be undone. They will be notified that you declined.
            </p>
            <div className="rhd-reject-modal-actions">
              <button className="rhd-reject-modal-cancel-btn" onClick={handleCancelReject}>
                Keep Request
              </button>
              <button className="rhd-reject-modal-confirm-btn" onClick={handleConfirmReject} disabled={isActionProcessing}>
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