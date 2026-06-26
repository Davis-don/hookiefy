import './failedpayment.css'
import { usePaymentModalStore } from './store/modalstore'

function Failedpayment() {
  const { close } = usePaymentModalStore();

  return (
    <div className="failed-payment-container">
      <div className="failed-payment-card">
        <div className="failed-payment-icon-wrapper">
          <div className="failed-payment-icon">❌</div>
        </div>
        <h2 className="failed-payment-title">Payment Failed</h2>
        <p className="failed-payment-subtitle">
          We couldn't process your payment. Please try again or use a different payment method.
        </p>
        <div className="failed-payment-details">
          <div className="failed-payment-detail">
            <span className="failed-payment-detail-label">Status</span>
            <span className="failed-payment-detail-value failed-payment-detail-failed">Failed</span>
          </div>
          <div className="failed-payment-detail">
            <span className="failed-payment-detail-label">Amount</span>
            <span className="failed-payment-detail-value">KES 500</span>
          </div>
          <div className="failed-payment-detail">
            <span className="failed-payment-detail-label">Reference</span>
            <span className="failed-payment-detail-value">HKY-2026-001</span>
          </div>
        </div>
        <div className="failed-payment-actions">
          <button className="failed-payment-btn failed-payment-btn-retry" onClick={close}>
            Try Again
          </button>
          <button className="failed-payment-btn failed-payment-btn-cancel" onClick={close}>
            Cancel
          </button>
        </div>
        <p className="failed-payment-help">
          Need help? <span className="failed-payment-help-link">Contact Support</span>
        </p>
      </div>
    </div>
  )
}

export default Failedpayment