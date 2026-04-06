// SubNotification.tsx
import { useQuery } from '@tanstack/react-query'
import './subnotification.css'

interface SubNotificationProps {
  isOpen: boolean
  onClose: () => void
}

interface HookupNotification {
  id: number
  sender: number
  receiver: number
  sender_name: string
  receiver_name: string
  status: string
  payment_status?: string
  is_read_by_sender: boolean
  is_read_by_receiver: boolean
  created_at: string
  sender_profile_img?: string | null
}

interface ReceivedHookupsResponse {
  received: HookupNotification[]
}

function SubNotification({ isOpen, onClose }: SubNotificationProps) {
  const apiUrl = import.meta.env.VITE_API_URL

  // Fetch received hookups (notifications) - READ ONLY, no mutations
  const { 
    data, 
    isLoading, 
    error,
    refetch 
  } = useQuery<ReceivedHookupsResponse>({
    queryKey: ['my-received-hookups-modal'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/hookup/my-received-hookups/`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      
      return response.json()
    },
    enabled: isOpen,
    refetchInterval: 30000, // Auto-refresh every 30 seconds when open
    refetchOnWindowFocus: true,
    // Don't mark as read automatically - read-only mode
  })

  // Get romantic status icon and message
  const getRomanticStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: '💕', message: 'sent you a hookup request' }
      case 'accepted':
        return { icon: '💖', message: 'accepted your hookup request' }
      case 'rejected':
        return { icon: '💔', message: 'declined your hookup request' }
      case 'cancelled':
        return { icon: '🚫', message: 'cancelled the hookup request' }
      case 'completed':
        return { icon: '✨', message: 'completed the hookup! Congratulations! 🎉' }
      default:
        return { icon: '💫', message: 'sent you a request' }
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  const receivedHookups = data?.received || []
  
  // Sort: newest first by created_at
  const sortedHookups = [...receivedHookups].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  
  const unreadCount = receivedHookups.filter(h => !h.is_read_by_receiver).length

  if (!isOpen) return null

  return (
    <div className="subnotif-overlay" onClick={onClose}>
      <div className="subnotif-modal" onClick={(e) => e.stopPropagation()}>
        <div className="subnotif-header">
          <h3 className="subnotif-title">
            🔔 Notifications
            {unreadCount > 0 && (
              <span className="subnotif-badge">{unreadCount}</span>
            )}
          </h3>
          <button className="subnotif-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="subnotif-body">
          {isLoading ? (
            <div className="subnotif-loading">
              <div className="subnotif-spinner"></div>
              <p>Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="subnotif-error">
              <span className="subnotif-error-icon">⚠️</span>
              <p>Failed to load notifications</p>
              <button className="subnotif-retry" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : sortedHookups.length === 0 ? (
            <div className="subnotif-empty">
              <span className="subnotif-empty-icon">🔔</span>
              <p>No notifications yet</p>
              <span className="subnotif-empty-sub">When someone sends you a hookup request, it will appear here</span>
            </div>
          ) : (
            <div className="subnotif-notifications-list">
              {sortedHookups.map((hookup) => {
                const romanticStatus = getRomanticStatus(hookup.status)
                const isUnread = !hookup.is_read_by_receiver
                
                return (
                  <div
                    key={hookup.id}
                    className={`subnotif-item ${isUnread ? 'subnotif-item-unread' : ''}`}
                  >
                    <div className="subnotif-item-icon">
                      {hookup.sender_profile_img ? (
                        <img 
                          src={hookup.sender_profile_img} 
                          alt={hookup.sender_name}
                          className="subnotif-avatar"
                        />
                      ) : (
                        <div className="subnotif-avatar-placeholder">
                          {hookup.sender_name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div className="subnotif-item-content">
                      <div className="subnotif-item-title">
                        <strong>{hookup.sender_name}</strong>
                        <span className="subnotif-status-icon">
                          {romanticStatus.icon}
                        </span>
                        {isUnread && (
                          <span className="subnotif-new-badge">New</span>
                        )}
                      </div>
                      <div className="subnotif-item-message">
                        You have received a hookup request from {hookup.sender_name}{' '}
                        {romanticStatus.message} 💕
                      </div>
                      <div className="subnotif-item-footer">
                        <span className={`subnotif-status-badge subnotif-status-${hookup.status}`}>
                          {hookup.status.charAt(0).toUpperCase() + hookup.status.slice(1)}
                        </span>
                        <span className="subnotif-time">{formatDate(hookup.created_at)}</span>
                      </div>
                    </div>
                    {isUnread && <div className="subnotif-unread-dot"></div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="subnotif-footer">
          <button className="subnotif-view-all" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default SubNotification