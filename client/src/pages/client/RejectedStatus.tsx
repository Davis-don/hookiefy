import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaTimesCircle, FaClock, FaTimes, FaTrash, FaHeartBroken } from 'react-icons/fa';
import { toast } from '../../store/Toaststore';
import './StatusComponents.css';

interface Hookup {
  id: number;
  rejected_at: string | null;
  receiver_name?: string;
  sender_name?: string;
  role?: 'sent' | 'received';
}

interface RejectedStatusProps {
  hookup: Hookup;
  onRefresh?: () => void;
  onClose?: () => void;
}

const RejectedStatus: React.FC<RejectedStatusProps> = ({ hookup, onRefresh, onClose }) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      toast.success('Hookup request removed', {
        title: '✓ Removed',
        icon: '🗑️',
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ['my-hookups'] });
      if (onRefresh) onRefresh();
      if (onClose) onClose();
      setShowDeleteModal(false);
    },
    onError: () => {
      toast.error('Failed to remove hookup', {
        title: '❌ Error',
        icon: '⚠️',
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
    deleteMutation.mutate();
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const getOtherPartyName = () => {
    if (hookup.role === 'sent') {
      return hookup.receiver_name || 'the recipient';
    }
    return hookup.sender_name || 'the sender';
  };

  return (
    <>
      <div className="status-card status-rejected">
        <div className="status-icon-wrapper">
          <FaTimesCircle className="status-icon" />
        </div>
        <div className="status-content">
          <h4 className="status-title">Request Declined</h4>
          <p className="status-description">
            Your hookup request was declined by {getOtherPartyName()}.
          </p>
          <div className="status-meta">
            <FaClock className="meta-icon" />
            <span>Declined on {formatDate(hookup.rejected_at)}</span>
          </div>
          <button className="status-delete-btn" onClick={handleDeleteClick}>
            <FaTrash />
            Remove Request
          </button>
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
            <h3 className="delete-modal-title">Remove Request?</h3>
            <p className="delete-modal-message">
              Are you sure you want to remove this declined request from <strong>{getOtherPartyName()}</strong>?
            </p>
            <p className="delete-modal-warning">
              This action cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <button className="delete-modal-cancel-btn" onClick={handleCancelDelete}>
                Cancel
              </button>
              <button className="delete-modal-confirm-btn" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RejectedStatus;