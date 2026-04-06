import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { toast } from '../../store/Toaststore'
import Spinner from '../../components/protected/protectedspinner/Spinner'
import './myacceptedpaid.css'

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
  is_paid: boolean
  is_read_by_sender: boolean
  is_read_by_receiver: boolean
  created_at: string
  sender_profile_img?: string | null
  receiver_profile_img?: string | null
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

interface MyacceptedpaidProps {
  hookup: HookupDetailData
  onHookupDeleted: () => void
  onBack: () => void
}

interface ApiError {
  error?: string
  detail?: string
  message?: string
}

function Myacceptedpaid({ hookup, onHookupDeleted, onBack }: MyacceptedpaidProps) {
  const apiUrl = import.meta.env.VITE_API_URL
  const queryClient = useQueryClient()
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  // Fetch receiver profile details
  const [receiverProfile, setReceiverProfile] = useState<ProfileData | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Fetch receiver profile
  useEffect(() => {
    const fetchReceiverProfile = async () => {
      if (!hookup.receiver) {
        setIsLoadingProfile(false)
        return
      }
  
      try {
        const response = await fetch(`${apiUrl}/profiles/profile/${hookup.receiver}/`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        })
  
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Receiver profile not found')
          }
          if (response.status === 403) {
            throw new Error('You are not authorized to view this profile')
          }
          throw new Error(`Failed to fetch receiver profile (Status: ${response.status})`)
        }
  
        const data = await response.json()
        setReceiverProfile(data)
        setProfileError(null)
      } catch (error) {
        console.error('Error fetching receiver profile:', error)
        setProfileError(error instanceof Error ? error.message : 'Failed to load receiver details')
      } finally {
        setIsLoadingProfile(false)
      }
    }
  
    fetchReceiverProfile()
  }, [hookup.receiver, apiUrl])

  // Complete hookup mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookup.id}/complete/`, {
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
      toast.info('Marking as completed...', { duration: 2000 })
    },
    onSuccess: (data) => {
      setShowCompleteModal(false)
      queryClient.invalidateQueries({ queryKey: ['my-sent-hookups'] })
      queryClient.invalidateQueries({ queryKey: ['hookup-detail', hookup.id] })
      
      toast.success(data.message || 'Hookup marked as completed! 🎉', {
        duration: 4000,
      })
      
      onHookupDeleted()
      onBack()
    },
    onError: (error: ApiError) => {
      const errorMessage = error.message || error.detail || error.error || 'Failed to mark as completed'
      toast.error(errorMessage, { duration: 5000 })
    },
  })

  const handleCompleteClick = () => {
    setShowCompleteModal(true)
  }

  const handleConfirmComplete = () => {
    completeMutation.mutate()
  }

  const handleCloseModals = () => {
    setShowCompleteModal(false)
  }

  // Loading state
  if (isLoadingProfile) {
    return (
      <div className="myacceptedpaid-container">
        <div className="myacceptedpaid-content">
          <div className="loading-spinner">Loading partner details...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="myacceptedpaid-container">
        {/* Complete Confirmation Modal */}
        {showCompleteModal && (
          <div className="modal-overlay" onClick={handleCloseModals}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon">⚠️</div>
              <h2 className="modal-title">Mark as Completed</h2>
              <p className="modal-message">Have you completed the hookup with <strong>{hookup.receiver_name}</strong>?</p>
              <p className="modal-success">✓ This will mark the hookup as successfully completed.</p>
              <div className="modal-buttons">
                <button 
                  className="modal-btn modal-cancel" 
                  onClick={handleCloseModals} 
                  disabled={completeMutation.isPending}
                >
                  Not Yet
                </button>
                <button 
                  className="modal-btn modal-confirm" 
                  onClick={handleConfirmComplete} 
                  disabled={completeMutation.isPending}
                >
                  {completeMutation.isPending ? 'Processing...' : 'Yes, Complete'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="myacceptedpaid-content">
          <div className="myacceptedpaid-icon">💎</div>
          <h1 className="myacceptedpaid-title">Ready to Go! 🚀</h1>
          
          {/* Back Button */}
          {onBack && (
            <button className="back-button-top" onClick={onBack}>
              ← Back to Hookups
            </button>
          )}
          
          <p className="myacceptedpaid-message">
            Payment confirmed! Your hookup with <strong>{hookup.receiver_name}</strong> is ready.
          </p>
          
          <div className="status-indicator success">
            <div className="status-dot success-dot"></div>
            <span className="status-text">Paid & Confirmed</span>
          </div>
          
          <div className="success-banner">
            <div className="success-icon">✓</div>
            <div className="success-text">
              <strong>Payment Successful</strong>
              <span>Your booking is confirmed</span>
            </div>
          </div>
          
          {/* Partner Contact Information */}
          {receiverProfile && !profileError && (
            <div className="partner-contact-card">
              <h3 className="partner-contact-title">✨ Partner Details ✨</h3>
              <p className="partner-contact-subtitle">Here are your partner's contact details:</p>
              
              <div className="contact-details">
                <div className="contact-item">
                  <span className="contact-icon">👤</span>
                  <div className="contact-info">
                    <span className="contact-label">Full Name</span>
                    <span className="contact-value">{receiverProfile.full_name || 'Not provided'}</span>
                  </div>
                </div>
                
                <div className="contact-item">
                  <span className="contact-icon">📧</span>
                  <div className="contact-info">
                    <span className="contact-label">Email Address</span>
                    <span className="contact-value">{receiverProfile.user?.email || 'Not provided'}</span>
                  </div>
                </div>
                
                <div className="contact-item">
                  <span className="contact-icon">📱</span>
                  <div className="contact-info">
                    <span className="contact-label">Phone Number</span>
                    <span className="contact-value">{receiverProfile.bio?.phone_number || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Request Details Card */}
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
          
          {/* Info Alert */}
          <div className="info-alert">
            <span className="alert-icon">ℹ️</span>
            <div className="alert-content">
              <strong>Need to complete this hookup?</strong>
              <p>Click the button below to mark this hookup as completed when you're done.</p>
            </div>
          </div>

          {/* Complete Button */}
          <button 
            className="complete-button" 
            onClick={handleCompleteClick} 
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending ? <Spinner size="small" color="white" /> : '✓ Mark as Completed'}
          </button>
          
          <div className="info-box">
            <p className="contact-note">💬 Feel free to reach out via your preferred platform. Stay safe and enjoy!</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Myacceptedpaid