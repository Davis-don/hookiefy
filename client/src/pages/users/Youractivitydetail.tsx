import './youractivitydetail.css'
import { usePreviewStore } from './store/connectpreview'
import { usePaymentModalStore } from './store/modalstore'
import { yourActivities } from './data/youractivity'
import { useState } from 'react'

function Youractivitydetail() {
  const { activityId, closeActivityPreview } = usePreviewStore();
  const { 
    open: openPaymentModal,
    setIsSuccessPayment,
    setIsFailedPayment,
    setIsLoadingPayment
  } = usePaymentModalStore();

  // TEST MODE - For development/testing
  const [testMode, setTestMode] = useState(false);

  // Find the activity data based on the ID from store
  const activityData = yourActivities.find(act => act.senderId === activityId);

  // If no data found, show a fallback
  if (!activityData) {
    return (
      <div className="overall-activity-detail">
        <div className="activity-detail-back" onClick={closeActivityPreview}>
          <span className="activity-detail-back-icon">←</span>
          <span className="activity-detail-back-text">Back</span>
        </div>
        <div className="activity-detail-not-found">
          <div className="activity-detail-not-found-icon">😕</div>
          <p>Activity not found</p>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    if (activityData.status === 'accepted') return '#22c55e';
    if (activityData.status === 'declined') return '#ef4444';
    return '#f59e0b';
  };

  const getStatusIcon = () => {
    if (activityData.status === 'accepted') return '✅';
    if (activityData.status === 'declined') return '❌';
    return '⏳';
  };

  const getStatusMessage = () => {
    if (activityData.status === 'accepted') {
      return 'You accepted this hookup request. Complete the payment to get connected instantly!';
    }
    if (activityData.status === 'declined') {
      return 'You declined this hookup request. You can always send a new request later.';
    }
    return 'This request is still pending.';
  };

  const handleCompleteHookup = () => {
    // Open payment modal with the hookup ID
    openPaymentModal(activityData.id);
  };

  // TEST FUNCTIONS
  const testSuccess = () => {
    setIsSuccessPayment(true);
  };

  const testFailed = () => {
    setIsFailedPayment(true);
  };

  const testLoading = () => {
    setIsLoadingPayment(true);
  };

  return (
    <div className="overall-activity-detail">
      {/* Back Button */}
      <div className="activity-detail-back" onClick={closeActivityPreview}>
        <span className="activity-detail-back-icon">←</span>
        <span className="activity-detail-back-text">Back to Activity</span>
      </div>

      {/* Profile Header */}
      <div className="activity-detail-profile">
        <img 
          src={activityData.senderAvatar} 
          alt={activityData.senderName} 
          className="activity-detail-avatar" 
        />
        <h2 className="activity-detail-name">{activityData.senderName}</h2>
        <div className="activity-detail-handle">
          @{activityData.senderName.toLowerCase().replace(' ', '_')}
        </div>
        <div className="activity-detail-status-badge" style={{ color: getStatusColor() }}>
          {getStatusIcon()} {activityData.status.toUpperCase()}
        </div>
      </div>

      {/* Stats */}
      <div className="activity-detail-stats">
        <div className="activity-detail-stat">
          <span className="activity-detail-stat-number">1</span>
          <span className="activity-detail-stat-label">Request</span>
        </div>
        <div className="activity-detail-stat">
          <span className="activity-detail-stat-number">{activityData.status === 'accepted' ? '✅' : '❌'}</span>
          <span className="activity-detail-stat-label">Status</span>
        </div>
        <div className="activity-detail-stat">
          <span className="activity-detail-stat-number">{activityData.respondedAt}</span>
          <span className="activity-detail-stat-label">Responded</span>
        </div>
      </div>

      {/* Message Section */}
      <div className="activity-detail-message">
        <div className="activity-detail-message-title">Their Message</div>
        <div className="activity-detail-message-text">"{activityData.message}"</div>
        <div className="activity-detail-message-time">Sent {activityData.time}</div>
      </div>

      {/* Status Message */}
      <div className="activity-detail-status-info">
        <div className="activity-detail-status-info-title">Status Update</div>
        <div className="activity-detail-status-info-text" style={{ borderLeftColor: getStatusColor() }}>
          {getStatusMessage()}
        </div>
      </div>

      {/* Payment Section - Only for accepted status */}
      {activityData.status === 'accepted' && (
        <div className="activity-detail-payment-section">
          <div className="activity-detail-payment-icon">💳</div>
          <h3 className="activity-detail-payment-title">Complete Payment to Connect</h3>
          <p className="activity-detail-payment-description">
            Complete the payment of <strong>KES 500</strong> to get connected instantly 
            with {activityData.senderName}. Secure and fast payment.
          </p>
          <div className="activity-detail-payment-features">
            <div className="activity-detail-payment-feature">
              <span className="activity-detail-payment-feature-icon">🔒</span>
              <span>Secure Payment</span>
            </div>
            <div className="activity-detail-payment-feature">
              <span className="activity-detail-payment-feature-icon">⚡</span>
              <span>Instant Connection</span>
            </div>
            <div className="activity-detail-payment-feature">
              <span className="activity-detail-payment-feature-icon">📱</span>
              <span>M-Pesa, Card & Bank</span>
            </div>
          </div>
        </div>
      )}

      {/* TEST MODE - Only visible in development */}
      <div className="activity-detail-test-mode">
        <div className="activity-detail-test-header">
          <span className="activity-detail-test-label">🧪 Test Modal States</span>
          <label className="activity-detail-test-toggle">
            <input 
              type="checkbox" 
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
            />
            <span className="activity-detail-test-slider"></span>
          </label>
        </div>
        {testMode && (
          <div className="activity-detail-test-options">
            <button 
              className="activity-detail-test-btn activity-detail-test-success"
              onClick={testSuccess}
            >
              ✅ Success
            </button>
            <button 
              className="activity-detail-test-btn activity-detail-test-failed"
              onClick={testFailed}
            >
              ❌ Failed
            </button>
            <button 
              className="activity-detail-test-btn activity-detail-test-loading"
              onClick={testLoading}
            >
              ⏳ Loading
            </button>
            <button 
              className="activity-detail-test-btn activity-detail-test-payment"
              onClick={handleCompleteHookup}
            >
              💳 Payment
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="activity-detail-actions">
        <button 
          className="activity-detail-btn activity-detail-btn-close"
          onClick={closeActivityPreview}
        >
          Close
        </button>
        {activityData.status === 'accepted' && (
          <button 
            className="activity-detail-btn activity-detail-btn-action"
            onClick={handleCompleteHookup}
          >
            Complete Hookup →
          </button>
        )}
      </div>
    </div>
  )
}

export default Youractivitydetail