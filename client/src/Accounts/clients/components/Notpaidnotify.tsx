import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from '../../../store/Toaststore'
import Spinner from '../../../components/protected/protectedspinner/Spinner'
import './notpaidnotify.css'

interface Props {
  hookupId: number
  onCancel?: () => void
}

interface ApiError {
  error?: string
  detail?: string
  message?: string
}

function Notpaidnotify({ hookupId, onCancel }: Props) {
  const apiUrl = import.meta.env.VITE_API_URL
  const queryClient = useQueryClient()
  const [showCancelModal, setShowCancelModal] = useState(false)

  // ✅ HARD GUARD
  if (!hookupId || hookupId <= 0) {
    return (
      <div className="notpaid-container">
        <div className="notpaid-content">
          <div className="notpaid-icon-wrapper">
            <div className="notpaid-icon">⚠️</div>
          </div>
          <h1 className="notpaid-title">Invalid Request</h1>
          <p className="notpaid-message">
            The request ID is invalid. Please go back and try again.
          </p>
          {onCancel && (
            <button className="cancel-request-btn" onClick={onCancel}>
              Go Back
            </button>
          )}
        </div>
      </div>
    )
  }

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookupId}/cancel/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw data
      }

      return data
    },
    onMutate: () => {
      toast.info('Cancelling your request...', { duration: 2000 })
    },
    onSuccess: (data) => {
      setShowCancelModal(false)
      queryClient.invalidateQueries({ queryKey: ['my-received-hookups'] })
      queryClient.invalidateQueries({ queryKey: ['my-sent-hookups'] })
      queryClient.invalidateQueries({ queryKey: ['hookup-detail', hookupId] })
      
      toast.success(data.message || 'Request cancelled successfully', {
        duration: 4000,
      })
      
      onCancel?.()
    },
    onError: (error: ApiError) => {
      const errorMessage = error.message || error.detail || error.error || 'Failed to cancel request'
      toast.error(errorMessage, { duration: 5000 })
    },
  })

  const handleCancelClick = () => {
    setShowCancelModal(true)
  }

  const handleConfirmCancel = () => {
    cancelMutation.mutate()
  }

  const handleCloseModal = () => {
    setShowCancelModal(false)
  }

  return (
    <>
      <div className="notpaid-container">
        <div className="notpaid-content">
          <div className="notpaid-icon-wrapper">
            <div className="notpaid-icon">💬</div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
            <div className="pulse-ring delay-2"></div>
          </div>
          
          <h1 className="notpaid-title">Awaiting Partner Response</h1>
          
          <p className="notpaid-message">
            Your hookup request has been sent! Please wait for your partner to respond.
          </p>
          
          <div className="status-indicator">
            <div className="status-dot"></div>
            <span className="status-text">Waiting for response...</span>
          </div>
          
          <div className="notification-banner">
            <div className="bell-icon">🔔</div>
            <div className="notification-text">
              <strong>We'll notify you instantly</strong> when your partner responds
            </div>
          </div>
          
          <p className="notpaid-note">
            💡 Keep checking your notifications for updates. You'll receive a real-time alert once your partner accepts or responds to your request.
          </p>
          
          <div className="loading-animation">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <span className="loading-text">Waiting for partner...</span>
          </div>

          {/* Cancel Request Button */}
          <button 
            className="cancel-request-btn"
            onClick={handleCancelClick}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? <Spinner size="small" color="#666" /> : 'Cancel Request'}
          </button>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="hn-modal-overlay" onClick={handleCloseModal}>
          <div className="hn-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="hn-modal-header">
              <div className="hn-modal-icon">🚫</div>
              <h3 className="hn-modal-title">Cancel Request</h3>
            </div>
            <div className="hn-modal-body">
              <p>Are you sure you want to cancel this hookup request?</p>
              <p className="hn-modal-warning">⚠️ This action cannot be undone. The request will be permanently deleted.</p>
            </div>
            <div className="hn-modal-footer">
              <button 
                className="hn-modal-btn hn-modal-secondary"
                onClick={handleCloseModal}
                disabled={cancelMutation.isPending}
              >
                Keep Request
              </button>
              <button 
                className="hn-modal-btn hn-modal-danger"
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? <Spinner size="small" color="white" /> : 'Yes, Cancel Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Notpaidnotify