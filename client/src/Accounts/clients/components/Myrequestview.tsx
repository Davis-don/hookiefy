import { useQuery } from '@tanstack/react-query'
import './myrequestview.css'
import Mypendingrequest from './Mypendingrequest'
import Myacceptednotpaid from './Myacceptednotpaid'
import Myacceptedpaid from './Myacceptedpaid'

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

interface MyrequestviewProps {
  hookupId: number
  onBack: () => void
  onHookupDeleted: () => void
}

function Myrequestview({ hookupId, onBack, onHookupDeleted }: MyrequestviewProps) {
  const apiUrl = import.meta.env.VITE_API_URL

  // Fetch hookup details with auto-refresh
  const { 
    data: hookup, 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useQuery<HookupDetailData>({
    queryKey: ['hookup-detail', hookupId],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookupId}/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch hookup details')
      }

      return response.json()
    },
    staleTime: 0,
    refetchOnWindowFocus: true,  // Refetch when window regains focus
    refetchInterval: 15000,      // Auto-refresh every 15 seconds
    refetchIntervalInBackground: false, // Only refresh when tab is active
  })

  if (isLoading) {
    return (
      <div className="myrequestview-loading">
        <div className="loading-spinner"></div>
        <p>Loading request details...</p>
      </div>
    )
  }

  if (error || !hookup) {
    return (
      <div className="myrequestview-error">
        <span className="error-icon">❌</span>
        <h3>Failed to load details</h3>
        <p className="error-message">Please check your connection and try again.</p>
        <button onClick={() => refetch()} className="retry-button">
          Retry
        </button>
        <button onClick={onBack} className="back-button">Go Back</button>
      </div>
    )
  }

  // Determine which component to render based on status and payment
  const renderComponent = () => {
    if (hookup.status === 'pending') {
      return (
        <Mypendingrequest 
          hookup={hookup}
          onHookupDeleted={onHookupDeleted}
          onBack={onBack}
        />
      )
    }
    
    if (hookup.status === 'accepted') {
      if (hookup.is_paid) {
        return (
          <Myacceptedpaid 
            hookup={hookup}
            onHookupDeleted={onHookupDeleted}
            onBack={onBack}
          />
        )
      } else {
        return (
          <Myacceptednotpaid 
            hookup={hookup}
            onHookupDeleted={onHookupDeleted}
            onBack={onBack}
          />
        )
      }
    }
    
    // Fallback for other statuses (completed, cancelled, etc.)
    return (
      <div className="fallback-component">
        <div className="fallback-content">
          <span className="fallback-icon">ℹ️</span>
          <h3>Request Status: {hookup.status}</h3>
          <p>This request is in {hookup.status} state.</p>
          <button onClick={onBack} className="back-button">Go Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="myrequestview-container">
      <div className="myrequestview-header">
        <div className="header-left">
          <button onClick={onBack} className="back-button">
            ← Back
          </button>
          <h1>Request Details</h1>
        </div>
        <div className="header-right">
          <button 
            onClick={() => refetch()} 
            className={`refresh-button ${isFetching ? 'refreshing' : ''}`}
            disabled={isFetching}
            title="Refresh"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {isFetching ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      {isFetching && !isLoading && (
        <div className="auto-refresh-indicator">
          <div className="refresh-spinner"></div>
          <span>Updating status...</span>
        </div>
      )}

      <div className="myrequestview-content">
        {renderComponent()}
      </div>
    </div>
  )
}

export default Myrequestview