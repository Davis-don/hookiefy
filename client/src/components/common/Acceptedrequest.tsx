import { useQuery } from '@tanstack/react-query'
import './acceptedrequest.css'
import Notpaidnotify from './Notpaidnotify'
import Ispaid from './Ispaid'

interface AcceptedrequestProps {
  hookupId: number
  senderId: number
  receiverId: number
  onBack: () => void
  onHookupCompleted?: () => void
}

interface HookupData {
  id: number
  status: string
  payment_status: string
  sender: number
  receiver: number
  sender_name?: string
  receiver_name?: string
  message?: string
  location?: string
  scheduled_time?: string
}

function Acceptedrequest({ hookupId, senderId, receiverId, onBack, onHookupCompleted }: AcceptedrequestProps) {
  const apiUrl = import.meta.env.VITE_API_URL || ''

  // Fetch hookup details using React Query with auto-refetch
  const { 
    data: hookupData, 
    isLoading, 
    error,
    refetch,
    isFetching
  } = useQuery<HookupData>({
    queryKey: ['hookup', hookupId],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookupId}/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.')
        }
        if (response.status === 404) {
          throw new Error('Hookup request not found.')
        }
        if (response.status === 403) {
          throw new Error('You are not authorized to view this hookup.')
        }
        throw new Error(`Failed to fetch hookup details (Status: ${response.status})`)
      }

      return response.json()
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    retry: 1,
  })

  // Manual refresh function
  const handleRefresh = () => {
    refetch()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="accepted-request-container">
        <button className="accepted-back-btn" onClick={onBack}>
          ← Back to Hookups
        </button>
        <div className="accepted-content">
          <div className="loading-spinner">Loading hookup details...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="accepted-request-container">
        <button className="accepted-back-btn" onClick={onBack}>
          ← Back to Hookups
        </button>
        <div className="accepted-content">
          <div className="error-message">
            <strong>Error:</strong> {error.message}
          </div>
          <button 
            className="retry-btn"
            onClick={handleRefresh}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#c41e3a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>
            Please go back and try again, or contact support if the problem persists.
          </p>
        </div>
      </div>
    )
  }

  // Check payment status
  const isPaymentPending = hookupData?.payment_status === 'unpaid' || hookupData?.payment_status === 'refunded'
  const isPaymentPaid = hookupData?.payment_status === 'paid'

  // Show Notpaidnotify if payment is pending - ✅ Pass hookupId
  if (isPaymentPending) {
    return (
      <>
        <div style={{ padding: '2rem 2rem 0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="accepted-back-btn" onClick={onBack}>
            ← Back to Hookups
          </button>
          <button 
            onClick={handleRefresh} 
            disabled={isFetching}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.2rem',
              opacity: isFetching ? 0.5 : 1
            }}
            title="Refresh"
          >
            🔄 {isFetching && 'Refreshing...'}
          </button>
        </div>
        <Notpaidnotify 
          hookupId={hookupId}  // ✅ Fixed: Pass hookupId
          onCancel={onBack}
        />
      </>
    )
  }

  // Show Ispaid component if payment is paid - ✅ Pass onBack
  if (isPaymentPaid) {
    return (
      <>
        <div style={{ padding: '2rem 2rem 0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="accepted-back-btn" onClick={onBack}>
            ← Back to Hookups
          </button>
          <button 
            onClick={handleRefresh} 
            disabled={isFetching}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.2rem',
              opacity: isFetching ? 0.5 : 1
            }}
            title="Refresh"
          >
            🔄 {isFetching && 'Refreshing...'}
          </button>
        </div>
        <Ispaid 
          hookupId={hookupId} 
          hookupData={hookupData}
          onConfirm={() => {
            onHookupCompleted?.()
            onBack()
          }}
          onBack={onBack}  // ✅ Pass onBack to Ispaid
        />
      </>
    )
  }

  // Default fallback for other cases
  return (
    <div className="accepted-request-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button className="accepted-back-btn" onClick={onBack}>
          ← Back to Hookups
        </button>
        <button 
          onClick={handleRefresh} 
          disabled={isFetching}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            backgroundColor: '#f3f4f6',
            opacity: isFetching ? 0.5 : 1
          }}
          title="Refresh data"
        >
          🔄 {isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      <div className="accepted-content">
        <div className="accepted-icon">💖</div>
        <h1 className="accepted-title">Request Accepted!</h1>
        <p className="accepted-message">
          You have successfully accepted this hookup request.
        </p>
        
        <div className="accepted-details">
          <div className="accepted-detail-item">
            <span className="accepted-detail-label">Hookup ID:</span>
            <span className="accepted-detail-value">{hookupId}</span>
          </div>
          <div className="accepted-detail-item">
            <span className="accepted-detail-label">Status:</span>
            <span className="accepted-detail-value">{hookupData?.status || 'Accepted'}</span>
          </div>
          <div className="accepted-detail-item">
            <span className="accepted-detail-label">Payment Status:</span>
            <span className="accepted-detail-value">{hookupData?.payment_status || 'Unknown'}</span>
          </div>
          <div className="accepted-detail-item">
            <span className="accepted-detail-label">Sender ID:</span>
            <span className="accepted-detail-value">{senderId}</span>
          </div>
          <div className="accepted-detail-item">
            <span className="accepted-detail-label">Receiver ID:</span>
            <span className="accepted-detail-value">{receiverId}</span>
          </div>
        </div>
        
        <p className="accepted-note">
          You can now start chatting and get to know each other better.
        </p>
        
        {isFetching && (
          <div className="refetching-indicator">
            Updating data...
          </div>
        )}
      </div>
    </div>
  )
}

export default Acceptedrequest