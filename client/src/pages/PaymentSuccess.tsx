import React, { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Copy } from 'lucide-react';
import { toast } from 'sonner';
import './PaymentPages.css';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  const orderTrackingId = searchParams.get('order_tracking_id');
  const merchantReference = searchParams.get('merchant_reference');
  const paymentStatus = searchParams.get('payment_status');
  const amount = searchParams.get('amount');
  const connectionId = searchParams.get('connection_id');

  useEffect(() => {
    // Show success toast
    toast.success('Payment Successful! 🎉', {
      description: `Your payment of KES ${amount || '0'} was completed successfully.`,
      duration: 5000,
      icon: '✅',
    });
  }, [amount]);

  const copyToClipboard = (text: string | null, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Copied!', {
      description: `${label} copied to clipboard.`,
      duration: 2000,
    });
  };

  return (
    <div className="payment-page-container">
      <div className="payment-page-card success-card">
        <div className="payment-page-icon success-icon">
          <CheckCircle size={64} />
        </div>
        
        <h1 className="payment-page-title">Payment Successful! 🎉</h1>
        <p className="payment-page-subtitle">
          Your hookup connection has been confirmed and is now active.
        </p>

        <div className="payment-page-details">
          <div className="payment-detail-row">
            <span className="payment-detail-label">Amount Paid</span>
            <span className="payment-detail-value">KES {amount || '0'}</span>
          </div>
          <div className="payment-detail-row">
            <span className="payment-detail-label">Payment Status</span>
            <span className="payment-detail-value status-completed">
              {paymentStatus || 'Completed'}
            </span>
          </div>
          <div className="payment-detail-row">
            <span className="payment-detail-label">Reference</span>
            <span className="payment-detail-value reference-value">
              {merchantReference || 'N/A'}
              {merchantReference && (
                <button 
                  className="copy-button"
                  onClick={() => copyToClipboard(merchantReference, 'Reference')}
                  aria-label="Copy reference"
                >
                  <Copy size={16} />
                </button>
              )}
            </span>
          </div>
          <div className="payment-detail-row">
            <span className="payment-detail-label">Tracking ID</span>
            <span className="payment-detail-value reference-value">
              {orderTrackingId || 'N/A'}
              {orderTrackingId && (
                <button 
                  className="copy-button"
                  onClick={() => copyToClipboard(orderTrackingId, 'Tracking ID')}
                  aria-label="Copy tracking ID"
                >
                  <Copy size={16} />
                </button>
              )}
            </span>
          </div>
          {connectionId && (
            <div className="payment-detail-row">
              <span className="payment-detail-label">Connection ID</span>
              <span className="payment-detail-value reference-value">
                {connectionId}
                <button 
                  className="copy-button"
                  onClick={() => copyToClipboard(connectionId, 'Connection ID')}
                  aria-label="Copy connection ID"
                >
                  <Copy size={16} />
                </button>
              </span>
            </div>
          )}
        </div>

        <div className="payment-page-actions">
          <Link to="/user/dashboard" className="payment-primary-button">
            Go to Dashboard
            <ArrowRight size={20} />
          </Link>
          <Link to="/" className="payment-secondary-button">
            Return Home
          </Link>
        </div>

        <div className="payment-page-footer">
          <p>Need help? <a href="/contact">Contact Support</a></p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;