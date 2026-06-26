import './isloadingpayment.css'

function Isloadingpayment() {
  return (
    <div className="loading-payment-container">
      <div className="loading-payment-card">
        <div className="loading-payment-spinner-wrapper">
          <div className="loading-payment-spinner">
            <div className="loading-payment-spinner-ring"></div>
            <div className="loading-payment-spinner-ring"></div>
            <div className="loading-payment-spinner-ring"></div>
          </div>
        </div>
        <h3 className="loading-payment-title">Processing Payment</h3>
        <p className="loading-payment-subtitle">Please wait while we complete your transaction...</p>
        <div className="loading-payment-progress">
          <div className="loading-payment-progress-bar">
            <div className="loading-payment-progress-fill"></div>
          </div>
          <span className="loading-payment-progress-text">Please don't close this window</span>
        </div>
        <div className="loading-payment-security">
          <span className="loading-payment-security-icon">🔒</span>
          <span>Secure encrypted connection</span>
        </div>
      </div>
    </div>
  )
}

export default Isloadingpayment