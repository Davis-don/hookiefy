// PaymentFailed.tsx
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from '../../../store/Toaststore';
import './paymentsuccess.css'
const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderTrackingId = searchParams.get('order_tracking_id');
  const status = searchParams.get('status');

  useEffect(() => {
    toast.error('Payment failed. Please try again.', {
      title: 'Payment Failed',
      duration: 5000,
    });
  }, []);

  return (
    <div className="payment-failed-container">
      <div className="failed-animation">
        <div className="failed-icon">❌</div>
      </div>
      
      <h1>Payment Failed! 😔</h1>
      <p>We couldn't process your payment. Please try again.</p>
      
      <div className="payment-details">
        <p><strong>Order Tracking ID:</strong></p>
        <code>{orderTrackingId}</code>
        <p><strong>Status:</strong> <span className="status-badge failed">{status || 'failed'}</span></p>
      </div>
      
      <div className="action-buttons">
        <button 
          className="retry-btn"
          onClick={() => navigate(-1)}
        >
          Try Again
        </button>
        <button 
          className="home-btn"
          onClick={() => navigate('/')}
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

export default PaymentFailed;