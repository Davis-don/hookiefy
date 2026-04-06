import './notificationpreview.css'

interface NotificationPreviewProps {
  hookupId: number
  name: string
  status: string
  timeAgo: string
  imgUrl?: string | null
  isUnread: boolean
  onClick: () => void
}

function Notificationpreview({ 
  name, 
  status, 
  timeAgo, 
  imgUrl, 
  isUnread, 
  onClick 
}: NotificationPreviewProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'accepted':
        return '✅'
      case 'completed':
        return '🎉'
      case 'rejected':
        return '❌'
      case 'cancelled':
        return '🚫'
      default:
        return '💕'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'accepted':
        return 'Accepted'
      case 'completed':
        return 'Completed'
      case 'rejected':
        return 'Rejected'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  return (
    <div 
      className={`notification-preview ${isUnread ? 'unread' : ''}`}
      onClick={onClick}
    >
      <div className="notification-avatar">
        {imgUrl ? (
          <img src={imgUrl} alt={name} className="avatar-img" />
        ) : (
          <div className="avatar-placeholder">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-name">{name}</span>
          <span className="notification-status">
            {getStatusIcon(status)} {getStatusText(status)}
          </span>
        </div>
        
        <div className="notification-message">
          You sent a hookup request to {name}
        </div>
        
        <div className="notification-footer">
          <span className="notification-time">{timeAgo}</span>
          {isUnread && <span className="unread-dot">• New</span>}
        </div>
      </div>
    </div>
  )
}

export default Notificationpreview