// Hookupnotificationinfo.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Acceptedrequest from './Acceptedrequest'
import Notpaidnotify from './Notpaidnotify'
import './hookupnotificationinfo.css'
import img1 from '../../assets/images/stefzn-pFW7o43y-FM-unsplash.jpg'
import Spinner from '../../components/protected/protectedspinner/Spinner'
import { toast } from '../../store/Toaststore'

interface HookupnotificationinfoProps {
  hookupId: number
  onBack: () => void
  onHookupDeleted?: () => void
}

interface HookupDetailData {
  id: number
  sender: number
  receiver: number
  sender_name: string
  receiver_name: string
  status: string
  payment_status?: string
  is_read_by_sender: boolean
  is_read_by_receiver: boolean
  is_read_by_current_user: boolean
  created_at: string
  sender_profile_img?: string | null
}

interface SenderProfileData {
  id: number
  full_name: string
  has_image: boolean
  has_bio: boolean
  profile_completion_percentage: number
  bio: {
    age: number | null
    gender: string | null
    country: string | null
    county: string | null
    location_desc: string | null
    info: string | null
    phone_number: string | null
    occupation: string | null
    interests: string | null
    uploaded_img: string | null
    is_verified: boolean
  } | null
  user: {
    email: string
    first_name: string
    last_name: string
  }
}

interface ApiError {
  error?: string
  detail?: string
  message?: string
}

function Hookupnotificationinfo({ hookupId, onBack, onHookupDeleted }: HookupnotificationinfoProps) {
  const apiUrl = import.meta.env.VITE_API_URL
  const queryClient = useQueryClient()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isAccepted, setIsAccepted] = useState(false)

  // ✅ HARD GUARD (FIXED)
  if (!hookupId || hookupId <= 0) {
    return (
      <div className="hn-hookup-container">
        <button className="hn-back-btn" onClick={onBack}>
          ← Back to Hookups
        </button>
        <div className="hn-error-wrapper">
          <div className="hn-error-icon">⚠️</div>
          <h3>Invalid Request</h3>
          <p>The hookup request ID is invalid. Please go back and try again.</p>
          <button className="hn-retry-btn" onClick={onBack}>
            Return to Hookups
          </button>
        </div>
      </div>
    )
  }

  // Fetch hookup details
  const {
    data: hookupData,
    isLoading: hookupLoading,
    error: hookupError,
    refetch: refetchHookup,
    isRefetching: isRefetchingHookup
  } = useQuery<HookupDetailData>({
    queryKey: ['hookup-detail', hookupId],
    queryFn: async () => {
      console.log('Fetching hookup details for ID:', hookupId)
      
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookupId}/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          onHookupDeleted?.()
          onBack()
          throw new Error('Hookup no longer exists')
        }
        throw new Error('Failed to fetch hookup details')
      }

      return response.json()
    },
    enabled: !!hookupId && hookupId > 0,
    staleTime: 0,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  })

  // Fetch sender's profile data
  const {
    data: senderProfile,
    isLoading: profileLoading,
    refetch: refetchProfile,
    isRefetching: isRefetchingProfile
  } = useQuery<SenderProfileData>({
    queryKey: ['sender-profile', hookupData?.sender],
    queryFn: async () => {
      if (!hookupData?.sender) {
        throw new Error('No sender ID available')
      }
      
      const response = await fetch(`${apiUrl}/profiles/profile/${hookupData.sender}/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sender profile')
      }

      return response.json()
    },
    enabled: !!hookupData?.sender && !!hookupId && !hookupLoading,
    staleTime: 30000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  })

  const handleManualRefresh = async () => {
    await Promise.all([refetchHookup(), refetchProfile()])
    toast.info('Refreshed successfully', { duration: 2000 })
  }

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!hookupId || hookupId <= 0) {
        throw new Error('Invalid hookup ID')
      }
      
      console.log('Accepting hookup with ID:', hookupId)
      
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookupId}/accept/`, {
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
      toast.info('Accepting request...', { duration: 2000 })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hookup-detail', hookupId] })
      queryClient.invalidateQueries({ queryKey: ['my-received-hookups'] })
      queryClient.invalidateQueries({ queryKey: ['sender-profile', hookupData?.sender] })
      
      toast.success(data.message || 'Hookup request accepted successfully! 💖', {
        duration: 4000,
      })
      
      setTimeout(() => {
        refetchHookup()
        refetchProfile()
      }, 500)
      
      setIsAccepted(true)
    },
    onError: (error: ApiError) => {
      const errorMessage = error.message || error.detail || error.error || 'Failed to accept request'
      toast.error(errorMessage, { duration: 5000 })
    },
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!hookupId || hookupId <= 0) {
        throw new Error('Invalid hookup ID')
      }
      
      console.log('Cancelling hookup with ID:', hookupId)
      
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
      toast.info('Cancelling request...', { duration: 2000 })
    },
    onSuccess: (data) => {
      setShowCancelModal(false)
      queryClient.invalidateQueries({ queryKey: ['hookup-detail', hookupId] })
      queryClient.invalidateQueries({ queryKey: ['my-received-hookups'] })
      queryClient.invalidateQueries({ queryKey: ['sender-profile', hookupData?.sender] })
      
      toast.success(data.message || 'Request cancelled successfully', {
        duration: 4000,
      })
      
      onHookupDeleted?.()
      
      setTimeout(() => {
        onBack()
      }, 1500)
    },
    onError: (error: ApiError) => {
      const errorMessage = error.message || error.detail || error.error || 'Failed to cancel request'
      toast.error(errorMessage, { duration: 5000 })
    },
  })

  const handleImageClick = () => {
    setShowImageModal(true)
    setZoomLevel(1)
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5))
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Response'
      case 'accepted': return 'Accepted ✓'
      case 'rejected': return 'Declined'
      case 'cancelled': return 'Cancelled'
      case 'completed': return 'Completed ✨'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'accepted': return '💖'
      case 'rejected': return '💔'
      case 'cancelled': return '🚫'
      case 'completed': return '🎉'
      default: return '💫'
    }
  }

  const isLoading = hookupLoading || profileLoading
  const isRefreshing = isRefetchingHookup || isRefetchingProfile

  // Check payment status
  const isPaymentPending = hookupData?.payment_status === 'unpaid' || hookupData?.payment_status === 'refunded'

  // ✅ FIXED ORDER - Check payment first
  if (!isLoading && hookupData && isPaymentPending && hookupData.status === 'accepted') {
    const validId = hookupData.id || hookupId
    if (validId > 0) {
      return (
        <Notpaidnotify
          hookupId={validId}
          onCancel={() => {
            onHookupDeleted?.()
            onBack()
          }}
        />
      )
    }
  }

  // Check if accepted
  if (isAccepted || hookupData?.status === 'accepted') {
    return (
      <Acceptedrequest
        hookupId={hookupData?.id || hookupId}
        senderId={hookupData?.sender || 0}
        receiverId={hookupData?.receiver || 0}
        onBack={onBack}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="hn-hookup-container">
        <button className="hn-back-btn" onClick={onBack}>
          ← Back to Hookups
        </button>
        <div className="hn-loading-wrapper">
          <Spinner size="large" color="#8B6914" message="Loading request details..." />
        </div>
      </div>
    )
  }

  if (hookupError || !hookupData) {
    return (
      <div className="hn-hookup-container">
        <button className="hn-back-btn" onClick={onBack}>
          ← Back to Hookups
        </button>
        <div className="hn-error-wrapper">
          <div className="hn-error-icon">⚠️</div>
          <h3>Unable to load request</h3>
          <p>The hookup request may have been deleted or no longer exists.</p>
          <button className="hn-retry-btn" onClick={onBack}>
            Return to Hookups
          </button>
        </div>
      </div>
    )
  }

  const showActionButtons = hookupData.status === 'pending'
  const profileImage = senderProfile?.bio?.uploaded_img || hookupData.sender_profile_img || img1

  return (
    <>
      <div className="hn-hookup-container">
        <div className="hn-header-bar">
          <button className="hn-back-btn" onClick={onBack}>
            ← Back to Hookups
          </button>
          <button 
            className={`hn-refresh-btn ${isRefreshing ? 'hn-refreshing' : ''}`} 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="hn-main-layout">
          {/* Hero Section with Large Clickable Image */}
          <div className="hn-hero-area">
            <div className="hn-image-section">
              <div className="hn-image-frame" onClick={handleImageClick}>
                <img 
                  src={profileImage} 
                  alt={hookupData.sender_name}
                  className="hn-large-image"
                />
                <div className="hn-image-overlay">
                  <span className="hn-zoom-icon">🔍</span>
                  <span>Click to enlarge</span>
                </div>
                {senderProfile?.bio?.is_verified && (
                  <div className="hn-verified-overlay">
                    <span>✓</span> Verified
                  </div>
                )}
              </div>
            </div>
            
            <div className="hn-info-section">
              <h1 className="hn-profile-title">{hookupData.sender_name}</h1>
              <div className="hn-meta-row">
                <span className="hn-id-badge">Request #{hookupData.id}</span>
                <span className="hn-date-badge">
                  {new Date(hookupData.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className={`hn-status-indicator hn-status-${hookupData.status}`}>
                <span className="hn-status-icon">{getStatusIcon(hookupData.status)}</span>
                <span className="hn-status-text">{getStatusText(hookupData.status)}</span>
              </div>
            </div>
          </div>

          {/* Status Message Card */}
          <div className="hn-message-card">
            <p className="hn-message-text">
              {hookupData.status === 'pending' && (
                <>💕 {hookupData.sender_name} has sent you a romantic hookup request. Take a moment to review their profile before deciding.</>
              )}
              {hookupData.status === 'completed' && (
                <>🎉 Congratulations! This hookup has been marked as completed. We hope you had a wonderful time!</>
              )}
            </p>
          </div>

          {/* About Section */}
          {senderProfile?.bio?.info && (
            <div className="hn-content-card">
              <h3 className="hn-card-heading">
                <span className="hn-card-icon">📝</span>
                About {hookupData.sender_name.split(' ')[0]}
              </h3>
              <p className="hn-card-description">{senderProfile.bio.info}</p>
            </div>
          )}

          {/* Personal Information Grid */}
          {(senderProfile?.bio?.age || senderProfile?.bio?.gender || senderProfile?.bio?.occupation) && (
            <div className="hn-content-card">
              <h3 className="hn-card-heading">
                <span className="hn-card-icon">👤</span>
                Personal Details
              </h3>
              <div className="hn-grid-layout">
                {senderProfile.bio.age && (
                  <div className="hn-grid-item">
                    <span className="hn-item-label">Age</span>
                    <span className="hn-item-value">{senderProfile.bio.age} years</span>
                  </div>
                )}
                {senderProfile.bio.gender && (
                  <div className="hn-grid-item">
                    <span className="hn-item-label">Gender</span>
                    <span className="hn-item-value">{senderProfile.bio.gender}</span>
                  </div>
                )}
                {senderProfile.bio.occupation && (
                  <div className="hn-grid-item">
                    <span className="hn-item-label">Occupation</span>
                    <span className="hn-item-value">{senderProfile.bio.occupation}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location Information */}
          {(senderProfile?.bio?.country || senderProfile?.bio?.county || senderProfile?.bio?.location_desc) && (
            <div className="hn-content-card">
              <h3 className="hn-card-heading">
                <span className="hn-card-icon">📍</span>
                Location
              </h3>
              <div className="hn-location-info">
                {(senderProfile.bio.country || senderProfile.bio.county) && (
                  <div className="hn-location-row">
                    <span className="hn-location-label">Region:</span>
                    <span className="hn-location-value">
                      {[senderProfile.bio.country, senderProfile.bio.county].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {senderProfile.bio.location_desc && (
                  <div className="hn-location-row">
                    <span className="hn-location-label">Area:</span>
                    <span className="hn-location-value">{senderProfile.bio.location_desc}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interests */}
          {senderProfile?.bio?.interests && (
            <div className="hn-content-card">
              <h3 className="hn-card-heading">
                <span className="hn-card-icon">🎯</span>
                Interests & Hobbies
              </h3>
              <div className="hn-tags-container">
                {senderProfile.bio.interests.split(',').map((interest, index) => (
                  <span key={index} className="hn-interest-tag">
                    {interest.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Profile Completion */}
          {senderProfile && (
            <div className="hn-content-card">
              <h3 className="hn-card-heading">
                <span className="hn-card-icon">📊</span>
                Profile Completion
              </h3>
              <div className="hn-progress-wrapper">
                <div className="hn-progress-bar-container">
                  <div 
                    className="hn-progress-fill"
                    style={{ width: `${senderProfile.profile_completion_percentage}%` }}
                  />
                </div>
                <div className="hn-progress-stats">
                  <span className="hn-progress-percentage">{senderProfile.profile_completion_percentage}%</span>
                  <span className="hn-progress-label">Complete</span>
                </div>
              </div>
            </div>
          )}

          {/* Request Details */}
          <div className="hn-content-card">
            <h3 className="hn-card-heading">
              <span className="hn-card-icon">📋</span>
              Request Information
            </h3>
            <div className="hn-details-list">
              <div className="hn-details-row">
                <span className="hn-details-label">Request ID</span>
                <span className="hn-details-value">#{hookupData.id}</span>
              </div>
              <div className="hn-details-row">
                <span className="hn-details-label">Date Received</span>
                <span className="hn-details-value">{new Date(hookupData.created_at).toLocaleString()}</span>
              </div>
              <div className="hn-details-row">
                <span className="hn-details-label">Current Status</span>
                <span className={`hn-details-value hn-status-${hookupData.status}`}>
                  {getStatusText(hookupData.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons - Only show for pending requests */}
          {showActionButtons && (
            <div className="hn-actions-area">
              <button 
                className="hn-action-btn hn-cancel-btn"
                onClick={() => setShowCancelModal(true)}
                disabled={cancelMutation.isPending || acceptMutation.isPending}
              >
                {cancelMutation.isPending ? <Spinner size="small" color="#666" /> : 'Cancel Request'}
              </button>
              <button 
                className="hn-action-btn hn-accept-btn"
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending || cancelMutation.isPending}
              >
                {acceptMutation.isPending ? <Spinner size="small" color="white" /> : 'Accept Request 💖'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal for Zooming */}
      {showImageModal && (
        <div className="hn-modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="hn-image-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="hn-image-modal-header">
              <h3 className="hn-image-modal-title">{hookupData.sender_name}</h3>
              <button className="hn-image-modal-close" onClick={() => setShowImageModal(false)}>
                ✕
              </button>
            </div>
            <div className="hn-image-modal-body">
              <div 
                className="hn-image-zoom-container"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <img 
                  src={profileImage} 
                  alt={hookupData.sender_name}
                  className="hn-modal-image"
                />
              </div>
            </div>
            <div className="hn-image-modal-footer">
              <button className="hn-zoom-btn" onClick={handleZoomOut} disabled={zoomLevel <= 0.5}>
                − Zoom Out
              </button>
              <span className="hn-zoom-level">{Math.round(zoomLevel * 100)}%</span>
              <button className="hn-zoom-btn" onClick={handleZoomIn} disabled={zoomLevel >= 3}>
                Zoom In +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="hn-modal-overlay" onClick={() => setShowCancelModal(false)}>
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
                onClick={() => setShowCancelModal(false)}
              >
                Keep Request
              </button>
              <button 
                className="hn-modal-btn hn-modal-danger"
                onClick={() => cancelMutation.mutate()}
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

export default Hookupnotificationinfo