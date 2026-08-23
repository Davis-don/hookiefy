import './dangerzone.css'
import { useState } from 'react'
import { IoMdClose } from "react-icons/io";
import { 
  FiAlertTriangle, 
  FiTrash2, 
  FiXCircle,
  FiAlertCircle
} from 'react-icons/fi'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore';
import { toast } from 'sonner'

interface DangerzoneProps {
  onClose?: () => void;
}

// Delete account function
const deleteAccount = async (accessToken: string | null): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/account/delete-account/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = 'Failed to delete account';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.detail || errorMessage;
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

function Dangerzone({ onClose }: DangerzoneProps) {
  const { access: accessToken, clearTokens } = useAuthStore();
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!accessToken) {
        throw new Error('You must be logged in to delete your account.');
      }
      return deleteAccount(accessToken);
    },
    onSuccess: () => {
      toast.success('Account deleted successfully!', {
        duration: 4000,
        icon: '🗑️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      
      // Clear tokens from store
      clearTokens();
      
      // Redirect to login or home page
      setTimeout(() => {
        window.location.href = '/signin';
      }, 1500);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete account', {
        description: error.message,
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    },
  });

  const handleDelete = () => {
    if (!accessToken) {
      toast.error('Not authenticated', {
        description: 'Please login to delete your account.',
        duration: 4000,
        icon: '🔒',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    deleteMutation.mutate();
  }

  const handleCancel = () => {
    setShowConfirm(false)
    setConfirmText('')
    if (onClose) onClose()
  }

  return (
    <div className="dz-main-wrapper">
      {/* Header Section */}
      <div className="dz-header-section">
        <div className="dz-header-left">
          <div className="dz-title-wrapper">
            <div className="dz-title-icon">
              <FiAlertTriangle />
            </div>
            <div>
              <h2 className="dz-page-title">Danger Zone</h2>
              <p className="dz-page-subtitle">Permanently delete your account and all associated data. This action cannot be undone.</p>
            </div>
          </div>
        </div>
        <div className="dz-header-right">
          {onClose && (
            <IoMdClose 
              onClick={handleCancel} 
              className={`dz-close-icon ${deleteMutation.isPending ? 'dz-disabled' : ''}`}
            />
          )}
        </div>
      </div>

      {/* Danger Content */}
      <div className="dz-content-container">
        <div className="dz-danger-card">
          <div className="dz-danger-icon-wrapper">
            <FiAlertCircle className="dz-danger-icon" />
          </div>
          <div className="dz-danger-content">
            <h3 className="dz-danger-title">Delete Account</h3>
            <p className="dz-danger-description">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            
            {!showConfirm ? (
              <button 
                className="dz-delete-btn"
                onClick={() => setShowConfirm(true)}
                disabled={deleteMutation.isPending}
              >
                <FiTrash2 className="dz-btn-icon" /> Delete Account
              </button>
            ) : (
              <div className="dz-confirm-section">
                <p className="dz-confirm-warning">
                  <FiAlertTriangle className="dz-warning-icon" />
                  Are you sure? Type <strong>"delete my account"</strong> to confirm.
                </p>
                <div className="dz-confirm-input-wrapper">
                  <input
                    type="text"
                    className="dz-confirm-input"
                    placeholder='Type "delete my account"'
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    disabled={deleteMutation.isPending}
                  />
                  <div className="dz-confirm-actions">
                    <button 
                      className="dz-confirm-delete-btn"
                      onClick={handleDelete}
                      disabled={confirmText !== 'delete my account' || deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <>
                          <span className="dz-spinner"></span> Deleting...
                        </>
                      ) : (
                        <>
                          <FiTrash2 className="dz-btn-icon" /> Yes, Delete My Account
                        </>
                      )}
                    </button>
                    <button 
                      className="dz-confirm-cancel-btn"
                      onClick={handleCancel}
                      disabled={deleteMutation.isPending}
                    >
                      <FiXCircle className="dz-btn-icon" /> Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dangerzone