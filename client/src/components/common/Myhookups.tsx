import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import './myhookups.css'
import 'bootstrap'
import Spinner from '../../components/protected/protectedspinner/Spinner'
import Hookupnotificationinfo from './Hookupnotificationinfo'
import HookupNotificationPreview from './Hookupnotificationpreiew'

interface HookupData {
  id: number
  sender: number
  receiver: number
  sender_name: string
  receiver_name: string
  status: string
  is_read_by_sender: boolean
  is_read_by_receiver: boolean
  is_read_by_current_user: boolean
  created_at: string
  sender_profile_img?: string | null
}

interface ReceivedHookupsResponse {
  received: HookupData[]
}

function Myhookups() {
  const apiUrl = import.meta.env.VITE_API_URL
  const queryClient = useQueryClient()
  const [selectedHookupId, setSelectedHookupId] = useState<number | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // Fetch only received hookups from backend
  const { 
    data, 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useQuery<ReceivedHookupsResponse>({
    queryKey: ['my-received-hookups'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/hookup/my-received-hookups/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch received hookups')
      }

      return response.json()
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (hookupId: number) => {
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookupId}/mark-read/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to mark as read')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-received-hookups'] })
    },
  })

  const handleNotificationClick = useCallback(async (hookup: HookupData) => {
    // Mark as read if it's unread
    if (!hookup.is_read_by_current_user) {
      await markAsReadMutation.mutateAsync(hookup.id)
    }
    // Store just the ID, not the whole object
    setSelectedHookupId(hookup.id)
    setShowDetail(true)
  }, [markAsReadMutation])

  const handleBack = useCallback(async () => {
    setShowDetail(false)
    setSelectedHookupId(null)
    await refetch()
  }, [refetch])

  const handleHookupDeleted = useCallback(() => {
    // Refresh the list when a hookup is deleted
    refetch()
  }, [refetch])

  const receivedHookups = data?.received || []
  
  // Sort: unread first, then by created_at (newest first)
  const sortedHookups = [...receivedHookups].sort((a, b) => {
    if (a.is_read_by_current_user !== b.is_read_by_current_user) {
      return a.is_read_by_current_user ? 1 : -1
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const unreadCount = receivedHookups.filter(h => !h.is_read_by_current_user).length

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    const intervals = [
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 },
    ]
    
    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds)
      if (count >= 1) {
        return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`
      }
    }
    return 'Just now'
  }

  if (isLoading) {
    return (
      <div className="myhookups-loading-container">
        <Spinner 
          size="large" 
          color="#8B6914" 
          message="Loading hookups..." 
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="myhookups-error-container">
        <div className="error-card">
          <span className="error-icon">💔</span>
          <h3>Failed to Load Hookups</h3>
          <p>There was an error loading your hookup requests. Please try again.</p>
          <button className="retry-btn" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="overall-my-hookups">
      {!showDetail ? (
        <>
          <div className="hookups-header">
            <div className="header-title-section">
              <h2 className="hookups-title">Romantic Hookups</h2>
              {unreadCount > 0 && (
                <span className="unread-count-badge">{unreadCount} new 💕</span>
              )}
            </div>
            <button 
              className={`refresh-button ${isFetching ? 'refreshing' : ''}`}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              {isFetching ? '...' : 'Refresh'}
            </button>
          </div>

          <div className="hookups-list">
            {sortedHookups.length === 0 ? (
              <div className="no-hookups-container">
                <div className="no-hookups-content">
                  <span className="no-hookups-icon">💕</span>
                  <h3>No Hookups Yet</h3>
                  <p>When someone sends you a romantic hookup request, it will appear here.</p>
                </div>
              </div>
            ) : (
              sortedHookups.map((hookup) => {
                const isUnread = !hookup.is_read_by_current_user
                
                return (
                  <HookupNotificationPreview
                    key={hookup.id}
                    hookupId={hookup.id}
                    name={hookup.sender_name}
                    status={hookup.status}
                    timeAgo={getTimeAgo(hookup.created_at)}
                    imgUrl={hookup.sender_profile_img}
                    isUnread={isUnread}
                    onClick={() => handleNotificationClick(hookup)}
                  />
                )
              })
            )}
          </div>
        </>
      ) : (
        selectedHookupId && (
          <Hookupnotificationinfo 
            hookupId={selectedHookupId}
            onBack={handleBack}
            onHookupDeleted={handleHookupDeleted}
          />
        )
      )}
    </div>
  )
}

export default Myhookups