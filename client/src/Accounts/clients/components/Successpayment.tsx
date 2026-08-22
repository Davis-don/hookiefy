import './successpayment.css'
import { usePaymentModalStore } from '../store/modalstore'
import { useEffect } from 'react'

function Successpayment() {
  const { close } = usePaymentModalStore();

  // Auto close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      close();
    }, 5000);
    return () => clearTimeout(timer);
  }, [close]);

  return (
    <div className="success-payment-container">
      <div className="success-payment-card">
        <div className="success-payment-icon-wrapper">
          <div className="success-payment-icon">✅</div>
        </div>
        <h2 className="success-payment-title">Payment Successful!</h2>
        <p className="success-payment-subtitle">
          Your hookup request has been confirmed. You are now connected!
        </p>
        <div className="success-payment-details">
          <div className="success-payment-detail">
            <span className="success-payment-detail-label">Status</span>
            <span className="success-payment-detail-value success-payment-detail-completed">Completed</span>
          </div>
          <div className="success-payment-detail">
            <span className="success-payment-detail-label">Amount</span>
            <span className="success-payment-detail-value">KES 500</span>
          </div>
          <div className="success-payment-detail">
            <span className="success-payment-detail-label">Reference</span>
            <span className="success-payment-detail-value">HKY-2026-001</span>
          </div>
        </div>
        <button className="success-payment-btn" onClick={close}>
          Done
        </button>
        <p className="success-payment-auto-close">Closing automatically in 5 seconds...</p>
      </div>
    </div>
  )
}

export default Successpayment