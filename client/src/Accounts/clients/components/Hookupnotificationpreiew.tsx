
import './hookupnotificationpreview.css'
import img1 from '../../assets/images/stefzn-pFW7o43y-FM-unsplash.jpg'
import 'bootstrap/dist/css/bootstrap.min.css'

// Preview Component with Props - Pure UI, no internal state management
interface HookupNotificationPreviewProps {
  hookupId: number
  name: string
  imgUrl?: string | null
  status?: string
  timeAgo?: string
  isUnread?: boolean
  onClick?: () => void
}

function HookupNotificationPreview({ 
  name, 
  imgUrl,
  status,
  timeAgo,
  isUnread,
  onClick
}: HookupNotificationPreviewProps) {

  // Get romantic status icon and message
  const getRomanticStatus = () => {
    switch (status) {
      case 'pending':
        return { icon: '💕', message: 'is waiting for your response' }
      case 'accepted':
        return { icon: '💖', message: 'accepted your request' }
      case 'rejected':
        return { icon: '💔', message: 'declined your request' }
      case 'cancelled':
        return { icon: '🌹', message: 'cancelled the request' }
      case 'completed':
        return { icon: '✨', message: 'completed! Congratulations! 🎉' }
      default:
        return { icon: '💫', message: 'sent you a request' }
    }
  }

  const romanticStatus = getRomanticStatus()

  return (
    <div className={`overall-hookup-notification-preview ${isUnread ? 'unread-notification' : ''}`} onClick={onClick}>
      {isUnread && <div className="unread-badge">New</div>}
      <div className="left-side-hookup-preview">
        <div className="hookup-preview-image-container">
          <div className="image-wrapper">
            <img 
              src={imgUrl || img1} 
              alt={`${name}'s profile`} 
              className="hookup-preview-image" 
            />
            <div className="image-glow"></div>
          </div>
        </div>
      </div>
      <div className="right-side-hookup-preview">
        <div className="hookup-preview-content">
          <div className="title-section">
            <span className="romantic-icon">{romanticStatus.icon}</span>
            <h3 className="hookup-preview-title">{name}</h3>
          </div>
          <p className="hookup-preview-description">
            You have received a hookup request from {name} {romanticStatus.message} 💕
          </p>
          {timeAgo && (
            <div className="time-section">
              <span className="time-ago">{timeAgo}</span>
            </div>
          )}
        </div>
      </div>
      <div className="notification-arrow">
        <span className="arrow-icon">→</span>
      </div>
    </div>
  )
}

export default HookupNotificationPreview