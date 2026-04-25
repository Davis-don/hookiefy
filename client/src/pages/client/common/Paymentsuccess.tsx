// PaymentSuccess.tsx
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from '../../../store/Toaststore';
import './paymentsuccess.css'

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderTrackingId = searchParams.get('order_tracking_id');
  const status = searchParams.get('status');

  useEffect(() => {
    // Notify parent or close window if this was a popup
    if (window.opener) {
      window.opener.postMessage({
        type: 'PESAPAL_PAYMENT_COMPLETE',
        status: 'completed',
        order_tracking_id: orderTrackingId
      }, '*');
      
      // Show success message before closing
      toast.success('Payment completed successfully!', {
        title: 'Success',
        duration: 3000,
      });
      
      // Close the popup after a short delay
      setTimeout(() => {
        window.close();
      }, 2000);
    } else {
      // Show success message
      toast.success('Payment completed successfully!', {
        title: '🎉 Payment Successful!',
        duration: 5000,
      });
      
      // Redirect to home after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    }
  }, [orderTrackingId, navigate]);

  return (
    <div className="payment-success-container">
      <div className="success-animation">
        <div className="success-checkmark">
          <div className="check-icon">
            <span className="icon-line line-tip"></span>
            <span className="icon-line line-long"></span>
            <div className="icon-circle"></div>
            <div className="icon-fix"></div>
          </div>
        </div>
      </div>
      
      <h1>Payment Successful! 🎉</h1>
      <p>Your payment has been completed successfully.</p>
      
      <div className="payment-details">
        <p><strong>Order Tracking ID:</strong></p>
        <code>{orderTrackingId}</code>
        <p><strong>Status:</strong> <span className="status-badge success">{status}</span></p>
      </div>
      
      <button 
        className="return-home-btn"
        onClick={() => navigate('/')}
      >
        Return to Home
      </button>
      
      {!window.opener && (
        <p className="auto-redirect">Redirecting to home in 3 seconds...</p>
      )}
    </div>
  );
};

export default PaymentSuccess;