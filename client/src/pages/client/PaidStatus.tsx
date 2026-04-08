import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaGrinHearts, FaCheckCircle, FaPhone, FaEnvelope, FaUser, FaTrash, FaTimes } from 'react-icons/fa';
import { toast } from '../../store/Toaststore';
import './StatusComponents.css';

interface Hookup {
  id: number;
  sender_name: string;
  paid_at: string | null;
  approved_at: string | null;
}

interface ReceivedPaidStatusProps {
  hookup: Hookup;
  onRefresh?: () => void;
  onClose?: () => void;
}

interface PartnerDetails {
  full_name: string;
  email: string;
  phone_number: string;
  role: string;
  hookup_status: string;
  payment_status: string;
  hookup_id: number;
}

const ReceivedPaidStatus: React.FC<ReceivedPaidStatusProps> = ({ hookup, onRefresh, onClose }) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const queryClient = useQueryClient();
  const [partnerDetails, setPartnerDetails] = useState<PartnerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPartnerDetails();
  }, [hookup.id]);

  const fetchPartnerDetails = async () => {
    try {
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookup.id}/partner-details/`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPartnerDetails(data);
      }
    } catch (error) {
      console.error('Failed to fetch partner details:', error);
    } finally {
      setIsLoading(false);
    }
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
      toast.success('Hookup completed and removed', {
        title: '✓ Finished',
        icon: '🎉',
        duration: 4000,
      });
      queryClient.invalidateQueries({ queryKey: ['my-hookups'] });
      if (onRefresh) onRefresh();
      if (onClose) onClose();
      setShowFinishModal(false);
    },
    onError: () => {
      toast.error('Failed to complete hookup', {
        title: '❌ Error',
        icon: '⚠️',
        duration: 3000,
      });
      setIsDeleting(false);
      setShowFinishModal(false);
    },
  });

  const handleFinishClick = () => {
    setShowFinishModal(true);
  };

  const handleConfirmFinish = () => {
    deleteMutation.mutate();
  };

  const handleCancelFinish = () => {
    setShowFinishModal(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="status-card status-received-paid">
        <div className="status-icon-wrapper">
          <FaGrinHearts className="status-icon" />
        </div>
        <div className="status-content">
          <div className="status-loading">
            <div className="loading-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
            <span className="loading-text">Loading partner details...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="status-card status-received-paid">
        <div className="status-icon-wrapper">
          <FaGrinHearts className="status-icon" />
        </div>
        <div className="status-content">
          <h4 className="status-title">Hookup Confirmed! ✓</h4>
          <p className="status-description">
            Payment completed! Your hookup with {partnerDetails?.full_name || hookup.sender_name} is confirmed.
          </p>
          
          {/* Partner Contact Details */}
          {partnerDetails && (
            <div className="partner-contact-details">
              <h5 className="partner-title">Contact Details</h5>
              <div className="partner-info">
                <div className="partner-info-item">
                  <FaUser className="partner-info-icon" />
                  <div>
                    <span className="partner-info-label">Full Name</span>
                    <span className="partner-info-value">{partnerDetails.full_name}</span>
                  </div>
                </div>
                <div className="partner-info-item">
                  <FaEnvelope className="partner-info-icon" />
                  <div>
                    <span className="partner-info-label">Email</span>
                    <span className="partner-info-value">{partnerDetails.email}</span>
                  </div>
                </div>
                <div className="partner-info-item">
                  <FaPhone className="partner-info-icon" />
                  <div>
                    <span className="partner-info-label">Phone Number</span>
                    <span className="partner-info-value">{partnerDetails.phone_number}</span>
                  </div>
                </div>
              </div>
              <div className="partner-chat-message">
                <p>You can now chat via any platform using the contact details above.</p>
              </div>
            </div>
          )}
          
          <div className="status-meta">
            <span>Paid on {formatDate(hookup.paid_at)}</span>
          </div>
          
          <button className="status-finish-btn" onClick={handleFinishClick}>
            <FaTrash />
            Finish & Remove
          </button>
          
          <div className="status-success">
            <FaCheckCircle className="success-icon" />
            <span>Enjoy your hookup! ✨</span>
          </div>
        </div>
      </div>

      {/* Custom Finish Confirmation Modal */}
      {showFinishModal && (
        <div className="delete-modal-overlay" onClick={handleCancelFinish}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <button className="delete-modal-close" onClick={handleCancelFinish}>
              <FaTimes />
            </button>
            <div className="delete-modal-icon">
              <FaTrash />
            </div>
            <h3 className="delete-modal-title">Finish Hookup?</h3>
            <p className="delete-modal-message">
              Are you sure you want to mark this hookup as finished and remove it?
            </p>
            <p className="delete-modal-warning">
              This action cannot be undone. The hookup will be permanently removed.
            </p>
            <div className="delete-modal-actions">
              <button className="delete-modal-cancel-btn" onClick={handleCancelFinish}>
                Cancel
              </button>
              <button className="delete-modal-confirm-btn" onClick={handleConfirmFinish} disabled={isDeleting}>
                {isDeleting ? 'Removing...' : 'Yes, Finish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReceivedPaidStatus;