import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from '../../../store/Toaststore'
import Spinner from '../../../components/protected/protectedspinner/Spinner'
import './mypendingrequest.css'

interface HookupDetailData {
  id: number
  sender: number
  receiver: number
  sender_name: string
  receiver_name: string
  message: string | null
  location: string | null
  scheduled_time: string | null
  status: string
  is_read_by_sender: boolean
  is_read_by_receiver: boolean
  created_at: string
  sender_profile_img?: string | null
  receiver_profile_img?: string | null
}

interface MypendingrequestProps {
  hookup: HookupDetailData
  onHookupDeleted: () => void
  onBack: () => void
}

interface ApiError {
  error?: string
  detail?: string
  message?: string
}

function Mypendingrequest({ hookup, onHookupDeleted, onBack }: MypendingrequestProps) {
  const apiUrl = import.meta.env.VITE_API_URL
  const queryClient = useQueryClient()
  const [showCancelModal, setShowCancelModal] = useState(false)

  // Cancel hookup mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookup.id}/cancel/`, {
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
      queryClient.invalidateQueries({ queryKey: ['my-sent-hookups'] })
      queryClient.invalidateQueries({ queryKey: ['hookup-detail', hookup.id] })
      
      toast.success(data.message || 'Request cancelled successfully', {
        duration: 4000,
      })
      
      onHookupDeleted()
      onBack()
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
      <div className="mypendingrequest-container">
        <div className="mypendingrequest-content">
          <div className="icon-wrapper">
            <div className="main-icon">💌</div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
            <div className="pulse-ring delay-2"></div>
          </div>
          
          <h1 className="title">Awaiting Partner's Response</h1>
          
          <p className="message">
            Your hookup request has been sent to <strong>{hookup.receiver_name}</strong>!
            Please wait for your partner to respond.
          </p>
          
          <div className="status-indicator">
            <div className="status-dot"></div>
            <span className="status-text">Waiting for {hookup.receiver_name} to respond...</span>
          </div>
          
          <div className="notification-banner">
            <div className="bell-icon">🔔</div>
            <div className="notification-text">
              <strong>We'll notify you instantly</strong> when your partner responds
            </div>
          </div>
          
          <div className="request-details-card">
            {hookup.message && (
              <div className="detail-row">
                <span className="detail-label">💬 Your Message:</span>
                <p className="detail-value">{hookup.message}</p>
              </div>
            )}

            {hookup.location && (
              <div className="detail-row">
                <span className="detail-label">📍 Location:</span>
                <p className="detail-value">{hookup.location}</p>
              </div>
            )}

            {hookup.scheduled_time && (
              <div className="detail-row">
                <span className="detail-label">🕒 Scheduled Time:</span>
                <p className="detail-value">
                  {new Date(hookup.scheduled_time).toLocaleString()}
                </p>
              </div>
            )}
          </div>
          
          <p className="note">
            💡 Please wait for your partner to approve to continue to the next step.
            You'll receive a real-time alert once your partner accepts your request.
          </p>
          
          <div className="loading-animation">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <span className="loading-text">Awaiting acceptance from {hookup.receiver_name}...</span>
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
              <p>Are you sure you want to cancel this hookup request to <strong>{hookup.receiver_name}</strong>?</p>
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

export default Mypendingrequest