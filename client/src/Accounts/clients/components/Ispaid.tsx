import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from '../../../store/Toaststore'
import './ispaid.css'

interface IspaidProps {
  hookupId: number
  onConfirm?: () => void
  onBack?: () => void
  hookupData?: {
    id: number
    status: string
    payment_status: string
    sender?: number
    receiver?: number
    message?: string
    location?: string
    scheduled_time?: string
    completed_at?: string
    paid_at?: string
    created_at?: string
  }
}

interface ProfileData {
  id: number
  full_name: string
  user: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  bio: {
    phone_number: string | null
  }
}

function Ispaid({ hookupData, hookupId, onConfirm, onBack }: IspaidProps) {
  const apiUrl = import.meta.env.VITE_API_URL || ''
  const queryClient = useQueryClient()
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)

  // Confirm mutation with toast notifications
  const confirmMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookupId}/confirm/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to confirm hookup')
      }

      return response.json()
    },
    onMutate: () => {
      toast.info('Confirming hookup completion...', { duration: 2000 })
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['hookup', hookupId] })
      queryClient.invalidateQueries({ queryKey: ['hookup-detail', hookupId] })
      queryClient.invalidateQueries({ queryKey: ['my-received-hookups'] })
      queryClient.invalidateQueries({ queryKey: ['my-sent-hookups'] })
      queryClient.invalidateQueries({ queryKey: ['unread-hookup-count'] })
      
      setShowConfirmModal(false)
      
      toast.success(data.message || 'Hookup confirmed successfully! 🎉', {
        duration: 4000,
      })
      
      // Immediately navigate back to list
      if (onConfirm) {
        onConfirm()
      }
      
      // Also call onBack to ensure navigation
      if (onBack) {
        setTimeout(() => {
          onBack()
        }, 100)
      }
    },
    onError: (error: Error) => {
      console.error('Confirm error:', error)
      toast.error(error.message || 'Failed to confirm hookup. Please try again.', {
        duration: 5000,
      })
    },
  })

  // Fetch sender profile details
  const {
    data: senderProfile,
    isLoading: isLoadingProfile,
    error: profileError
  } = useQuery<ProfileData>({
    queryKey: ['senderProfile', hookupData?.sender],
    queryFn: async () => {
      if (!hookupData?.sender) {
        throw new Error('Sender ID not available')
      }

      const response = await fetch(`${apiUrl}/profiles/profile/${hookupData.sender}/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Sender profile not found')
        }
        if (response.status === 403) {
          throw new Error('You are not authorized to view this profile')
        }
        throw new Error(`Failed to fetch sender profile (Status: ${response.status})`)
      }

      return response.json()
    },
    enabled: !!hookupData?.sender,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const handleConfirmClick = () => {
    setShowConfirmModal(true)
  }

  const handleConfirm = () => {
    confirmMutation.mutate()
  }

  const handleCancelConfirm = () => {
    setShowConfirmModal(false)
  }

  // Loading state
  if (isLoadingProfile) {
    return (
      <div className="ispaid-container">
        <div className="ispaid-content">
          <div className="ispaid-icon">💖</div>
          <h1 className="ispaid-title">Hookup Confirmed!</h1>
          <p className="ispaid-message">Your hookup request has been confirmed.</p>
          <div className="loading-spinner">Loading partner details...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (profileError) {
    return (
      <div className="ispaid-container">
        <div className="ispaid-content">
          <div className="ispaid-icon">💖</div>
          <h1 className="ispaid-title">Hookup Confirmed!</h1>
          <p className="ispaid-message">Your hookup request has been confirmed.</p>
          <div className="error-message">Unable to load partner details. Please refresh the page.</div>
          {onBack && (
            <button className="back-button" onClick={onBack}>
              ← Back to Hookups
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="ispaid-container">
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">⚠️</div>
            <h2 className="modal-title">Confirm Hookup Completion</h2>
            <p className="modal-message">Are you sure you want to mark this hookup as confirmed?</p>
            <p className="modal-warning">This will permanently delete all hookup records and you won't be able to access this information again.</p>
            <div className="modal-buttons">
              <button 
                className="modal-btn modal-cancel" 
                onClick={handleCancelConfirm} 
                disabled={confirmMutation.isPending}
              >
                Cancel
              </button>
              <button 
                className="modal-btn modal-confirm" 
                onClick={handleConfirm} 
                disabled={confirmMutation.isPending}
              >
                {confirmMutation.isPending ? 'Confirming...' : 'Yes, Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ispaid-content">
        <div className="ispaid-icon">💖</div>
        <h1 className="ispaid-title">Hookup Confirmed! 🎉</h1>
        
        {/* Back Button */}
        {onBack && (
          <button className="back-button-top" onClick={onBack}>
            ← Back to Hookups
          </button>
        )}
        
        {/* Partner Contact Information */}
        {senderProfile && (
          <div className="partner-contact-card">
            <h3 className="partner-contact-title">✨ Partner Details ✨</h3>
            <p className="partner-contact-subtitle">Here are your partner's contact details:</p>
            
            <div className="contact-details">
              <div className="contact-item">
                <span className="contact-icon">👤</span>
                <div className="contact-info">
                  <span className="contact-label">Full Name</span>
                  <span className="contact-value">{senderProfile.full_name || 'Not provided'}</span>
                </div>
              </div>
              
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <div className="contact-info">
                  <span className="contact-label">Email Address</span>
                  <span className="contact-value">{senderProfile.user?.email || 'Not provided'}</span>
                </div>
              </div>
              
              <div className="contact-item">
                <span className="contact-icon">📱</span>
                <div className="contact-info">
                  <span className="contact-label">Phone Number</span>
                  <span className="contact-value">{senderProfile.bio?.phone_number || 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Alert */}
        <div className="info-alert">
          <span className="alert-icon">ℹ️</span>
          <div className="alert-content">
            <strong>Need to confirm this hookup?</strong>
            <p>Click the button below to confirm and remove this hookup from your notifications. This will permanently delete all records.</p>
          </div>
        </div>

        {/* Confirm Button */}
        <button 
          className="confirm-button" 
          onClick={handleConfirmClick} 
          disabled={confirmMutation.isPending}
        >
          {confirmMutation.isPending ? 'Processing...' : '✓ Confirm Hookup Completed'}
        </button>
        
        <div className="info-box">
          <p className="contact-note">💬 Feel free to reach out via your preferred platform. Stay safe and enjoy!</p>
        </div>
      </div>
    </div>
  )
}

export default Ispaid