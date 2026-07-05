import './connectionrequestpreview.css'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import { toast } from 'sonner'
import type { ConnectionRequest } from './Connectionrequest'

interface ConnectionrequestpreviewProps {
  request: ConnectionRequest;
  onClick: () => void;
}

// API call to accept connection request
const acceptConnection = async (accessToken: string | null, connectionId: string): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/connections/accept/${connectionId}/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to accept connection request');
  }

  return response.json();
};

// API call to reject connection request
const rejectConnection = async (accessToken: string | null, connectionId: string): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/connections/reject/${connectionId}/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to reject connection request');
  }

  return response.json();
};

function Connectionrequestpreview({ request, onClick }: ConnectionrequestpreviewProps) {
  const { senderName, senderAvatar, time, connection_id } = request;
  const { access: accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: () => acceptConnection(accessToken, connection_id),
    onSuccess: (data) => {
      toast.success('Connection accepted! 🎉', {
        description: `You are now connected with ${senderName}`,
        duration: 5000,
        icon: '🤝',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      
      // Invalidate and refetch connection requests
      queryClient.invalidateQueries({ queryKey: ['connectionRequests'] });
      
      console.log('✅ Connection accepted:', data);
    },
    onError: (error: Error) => {
      toast.error('Failed to accept connection', {
        description: error.message || 'Please try again later.',
        duration: 6000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      console.error('❌ Accept error:', error);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: () => rejectConnection(accessToken, connection_id),
    onSuccess: (data) => {
      toast.success('Connection declined', {
        description: `You have declined the request from ${senderName}`,
        duration: 5000,
        icon: '❌',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      
      // Invalidate and refetch connection requests
      queryClient.invalidateQueries({ queryKey: ['connectionRequests'] });
      
      console.log('❌ Connection declined:', data);
    },
    onError: (error: Error) => {
      toast.error('Failed to decline connection', {
        description: error.message || 'Please try again later.',
        duration: 6000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      console.error('❌ Reject error:', error);
    },
  });

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Show loading toast
    const loadingToast = toast.loading('Accepting connection...', {
      description: `Connecting with ${senderName}`,
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    acceptMutation.mutate(undefined, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      }
    });
  };

  const handleDecline = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Show loading toast
    const loadingToast = toast.loading('Declining connection...', {
      description: `Declining request from ${senderName}`,
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    rejectMutation.mutate(undefined, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      }
    });
  };

  const isProcessing = acceptMutation.isPending || rejectMutation.isPending;

  return (
    <div className="overall-conection-requst-preview" onClick={onClick}>
      <div className="conn-req-avatar-wrapper">
        {senderAvatar ? (
          <img 
            src={senderAvatar} 
            alt={senderName} 
            className="conn-req-avatar" 
          />
        ) : (
          <div className="conn-req-avatar-fallback">
            <span>{senderName.charAt(0).toUpperCase()}</span>
          </div>
        )}
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
          disabled={isProcessing}
        >
          {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
        </button>
        <button 
          className="conn-req-action-btn conn-req-decline-btn"
          onClick={handleDecline}
          disabled={isProcessing}
        >
          {rejectMutation.isPending ? 'Declining...' : 'Decline'}
        </button>
      </div>
    </div>
  )
}

export default Connectionrequestpreview