// PaymentFailure.tsx
import React, { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import './PaymentFailure.css';

const PaymentFailure: React.FC = () => {
  const [searchParams] = useSearchParams();

  const message = searchParams.get('message');

  useEffect(() => {
    toast.error('Payment Failed ❌', {
      description: message || 'Your payment was not completed. Please try again.',
      duration: 6000,
      icon: '❌',
    });
  }, [message]);

  const handleRetry = () => {
    window.location.href = '/user/dashboard';
  };

  return (
    <div className="pf-wrapper">
      <div className="pf-card">
        <div className="pf-icon-container">
          <div className="pf-icon-ring">
            <div className="pf-icon-bg">
              <XCircle size={64} className="pf-x-icon" />
            </div>
          </div>
        </div>

        <h1 className="pf-title">Payment Failed ❌</h1>
        <p className="pf-subtitle">
          {message ||
            'Your payment was not completed. Please try again or contact support.'}
        </p>

        <div className="pf-details-grid">
          <div className="pf-detail-item">
            <span className="pf-detail-label">Status</span>
            <div className="pf-detail-value-group">
              <span className="pf-detail-value pf-status-value">Failed</span>
            </div>
          </div>
        </div>

        <div className="pf-actions">
          <button onClick={handleRetry} className="pf-btn-primary">
            <RefreshCw size={20} />
            <span>Try Again</span>
          </button>
          <Link to="/user/dashboard" className="pf-btn-secondary">
            <span>Go to Dashboard</span>
            <ArrowRight size={20} />
          </Link>
        </div>

        <div className="pf-footer">
          <p>
            Need help? <a href="/contact">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;