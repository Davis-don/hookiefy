import './homecontentinfonotification.css';

interface HomecontentinfonotificationProps {
  isComplete: boolean;
  completionPercentage: number;
  missingFields: string[];
  onRefresh?: () => void;
  onNavigate?: (page: string) => void;
}

function Homecontentinfonotification({ 
  isComplete, 
  completionPercentage, 
  onRefresh,
  onNavigate
}: HomecontentinfonotificationProps) {
  
  // Don't render if bio is complete
  if (isComplete) return null;


  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="notification-sticky-wrapper">
      <div className="homecontentinfo-notification">
        <div className="notification-icon">
          <span>✨</span>
        </div>
        
        <div className="notification-content">
          <div className="notification-header">
            <h3>Complete Your Profile to Get Started</h3>
            {onRefresh && (
              <button 
                className="refresh-status-btn" 
                onClick={handleRefresh}
                title="Check status again"
              >
                🔄
              </button>
            )}
          </div>
          
          <p>Please complete your profile information to connect with others and access all features</p>
     
          
          <div className="completion-progress">
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="completion-text">{completionPercentage}% Complete</span>
          </div>
          
          <div className="action-buttons">
            {/* Edit Profile Photo Button */}
            <button 
              className="btn-primary"
              onClick={() => handleNavigate('profilephoto')}
            >
              <span>📸</span>
              Edit Profile Photo
            </button>
            
            {/* Edit Bio Info Button */}
            <button 
              className="btn-secondary"
              onClick={() => handleNavigate('profilebio')}
            >
              <span>✏️</span>
              Edit Bio Info
            </button>
          </div>
          
          <div className="notification-footer">
            <span className="footer-icon">💡</span>
            <span className="footer-text">
              Complete both sections to unlock all features and connect with others
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Homecontentinfonotification;