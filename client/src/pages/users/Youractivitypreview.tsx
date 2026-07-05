import './youractivitypreview.css'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import { toast } from 'sonner'
import { usePaymentModalStore } from './store/modalstore'
import type { Activity } from './Youractivity'

interface YouractivitypreviewProps {
  activity: Activity;
  onClick: () => void;
}

// API call to cancel/clear connection request (can override ANY status)
const cancelConnection = async (accessToken: string | null, connectionId: string): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  // Use the cancel endpoint - can override ANY status to REJECTED
  const response = await fetch(`${import.meta.env.VITE_API_URL}/connections/cancel/${connectionId}/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to cancel connection');
  }

  return response.json();
};

function Youractivitypreview({ activity, onClick }: YouractivitypreviewProps) {
  const { senderName, senderAvatar, status, time, connection_id } = activity;
  const { access: accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const { open: openPaymentModal } = usePaymentModalStore();

  // Check if the activity is clickable (only accepted status is clickable)
  const isClickable = status === 'accepted';
  const isDisabled = status === 'rejected' || status === 'completed';

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: () => cancelConnection(accessToken, connection_id),
    onSuccess: (data) => {
      toast.success('Connection cancelled', {
        description: `You have cancelled the connection with ${senderName}`,
        duration: 5000,
        icon: '🗑️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      
      // Invalidate and refetch activity
      queryClient.invalidateQueries({ queryKey: ['allConnectionRequests'] });
      
      console.log('🗑️ Connection cancelled:', data);
    },
    onError: (error: Error) => {
      // Check if the error is a 403 Forbidden
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        toast.error('Cannot cancel this connection', {
          description: 'You are not the receiver of this connection.',
          duration: 6000,
          icon: '⚠️',
          style: {
            background: '#1a1a2e',
            border: '1px solid #ef4444',
            color: '#ffffff',
          },
        });
      } else {
        toast.error('Failed to cancel connection', {
          description: error.message || 'Please try again later.',
          duration: 6000,
          icon: '⚠️',
          style: {
            background: '#1a1a2e',
            border: '1px solid #ef4444',
            color: '#ffffff',
          },
        });
      }
      console.error('❌ Cancel error:', error);
    },
  });

  const handlePay = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('💳 Opening payment modal for:', senderName);
    // Open payment modal with the connection ID
    openPaymentModal(connection_id);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Show loading toast
    const loadingToast = toast.loading('Cancelling connection...', {
      description: `Cancelling connection with ${senderName}`,
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    cancelMutation.mutate(undefined, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      }
    });
  };

  const getStatusIcon = () => {
    if (status === 'accepted') {
      return '✅';
    }
    if (status === 'rejected') {
      return '❌';
    }
    if (status === 'completed') {
      return '✅';
    }
    return '⏳';
  };

  const getStatusText = () => {
    if (status === 'accepted') {
      return 'Accepted';
    }
    if (status === 'rejected') {
      return 'Declined';
    }
    if (status === 'completed') {
      return 'Completed';
    }
    return 'Pending';
  };

  const getStatusColor = () => {
    if (status === 'accepted') {
      return '#22c55e';
    }
    if (status === 'rejected') {
      return '#ef4444';
    }
    if (status === 'completed') {
      return '#3b82f6';
    }
    return '#f59e0b';
  };

  const getStatusMessage = () => {
    if (status === 'accepted') {
      return `${senderName} accepted your request`;
    }
    if (status === 'rejected') {
      return `${senderName} declined your request`;
    }
    if (status === 'completed') {
      return `Completed with ${senderName}`;
    }
    return 'Waiting for response';
  };

  const getProgressDots = () => {
    if (status === 'accepted') {
      return (
        <div className="your-activity-progress-dots">
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
          <span className="your-activity-dot your-activity-dot-accepted-active"></span>
          <span className="your-activity-dot your-activity-dot-accepted-inactive"></span>
        </div>
      );
    }
    if (status === 'rejected') {
      return (
        <div className="your-activity-progress-dots">
          <span className="your-activity-dot your-activity-dot-declined-completed"></span>
          <span className="your-activity-dot your-activity-dot-declined"></span>
          <span className="your-activity-dot your-activity-dot-declined-inactive"></span>
          <span className="your-activity-dot your-activity-dot-declined-inactive"></span>
          <span className="your-activity-dot your-activity-dot-declined-inactive"></span>
        </div>
      );
    }
    if (status === 'completed') {
      return (
        <div className="your-activity-progress-dots">
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
          <span className="your-activity-dot your-activity-dot-accepted-completed"></span>
        </div>
      );
    }
    return (
      <div className="your-activity-progress-dots">
        <span className="your-activity-dot your-activity-dot-pending-completed"></span>
        <span className="your-activity-dot your-activity-dot-pending-active"></span>
        <span className="your-activity-dot your-activity-dot-pending-inactive"></span>
        <span className="your-activity-dot your-activity-dot-pending-inactive"></span>
        <span className="your-activity-dot your-activity-dot-pending-inactive"></span>
      </div>
    );
  };

  const isProcessing = cancelMutation.isPending;

  return (
    <div 
      className={`overall-your-activity-preview ${!isClickable ? 'your-activity-disabled' : ''}`}
      onClick={isClickable ? onClick : undefined}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
    >
      <div className="your-activity-avatar-wrapper">
        {senderAvatar ? (
          <img 
            src={senderAvatar} 
            alt={senderName} 
            className="your-activity-avatar" 
          />
        ) : (
          <div className="your-activity-avatar-fallback">
            <span>{senderName?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
        )}
        <div 
          className="your-activity-status-dot"
          style={{ background: getStatusColor() }}
        ></div>
      </div>
      
      <div className="your-activity-content">
        <div className="your-activity-message">
          <span className="your-activity-message-text">
            <strong>{senderName}</strong> 
            <span className="your-activity-status-badge" style={{ color: getStatusColor() }}>
              {getStatusIcon()} {getStatusText()}
            </span>
          </span>
        </div>
        <div className="your-activity-status-message">
          {getStatusMessage()}
        </div>
        <div className="your-activity-time">
          {time}
        </div>
      </div>

      <div className="your-activity-right-section">
        <div className="your-activity-progress-section">
          {getProgressDots()}
        </div>
        <div className="your-activity-status-label">
          <span style={{ color: getStatusColor() }}>
            {getStatusText().toUpperCase()}
          </span>
        </div>
        {isDisabled && (
          <div className="your-activity-disabled-badge">
            <span>🔒</span>
          </div>
        )}
      </div>

      {/* Action Buttons - Only show for accepted status */}
      {isClickable && (
        <div className="your-activity-action-buttons">
          <button 
            className="your-activity-action-btn your-activity-pay-btn"
            onClick={handlePay}
          >
            💳 Pay
          </button>
          <button 
            className="your-activity-action-btn your-activity-cancel-btn"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            {isProcessing ? 'Cancelling...' : 'Cancel'}
          </button>
        </div>
      )}
    </div>
  )
}

export default Youractivitypreview