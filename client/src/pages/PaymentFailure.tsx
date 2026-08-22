import React, { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import './PaymentPages.css';

const PaymentFailure: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  const orderTrackingId = searchParams.get('order_tracking_id');
  const merchantReference = searchParams.get('merchant_reference');
  const message = searchParams.get('message');

  useEffect(() => {
    // Show error toast
    toast.error('Payment Failed ❌', {
      description: message || 'Your payment was not completed. Please try again.',
      duration: 6000,
      icon: '❌',
    });
  }, [message]);

  const handleRetry = () => {
    // Redirect to initiate payment again - you may need to pass connection_id
    window.location.href = '/user/dashboard';
  };

  return (
    <div className="payment-page-container">
      <div className="payment-page-card failure-card">
        <div className="payment-page-icon failure-icon">
          <XCircle size={64} />
        </div>
        
        <h1 className="payment-page-title">Payment Failed ❌</h1>
        <p className="payment-page-subtitle">
          {message || 'Your payment was not completed. Please try again or contact support.'}
        </p>

        <div className="payment-page-details">
          {merchantReference && (
            <div className="payment-detail-row">
              <span className="payment-detail-label">Reference</span>
              <span className="payment-detail-value">{merchantReference}</span>
            </div>
          )}
          {orderTrackingId && (
            <div className="payment-detail-row">
              <span className="payment-detail-label">Tracking ID</span>
              <span className="payment-detail-value">{orderTrackingId}</span>
            </div>
          )}
          <div className="payment-detail-row">
            <span className="payment-detail-label">Status</span>
            <span className="payment-detail-value status-failed">Failed</span>
          </div>
        </div>

        <div className="payment-page-actions">
          <button onClick={handleRetry} className="payment-primary-button">
            <RefreshCw size={20} />
            Try Again
          </button>
          <Link to="/user/dashboard" className="payment-secondary-button">
            Go to Dashboard
            <ArrowRight size={20} />
          </Link>
        </div>

        <div className="payment-page-footer">
          <p>Need help? <a href="/contact">Contact Support</a></p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;