// PaymentSuccess.tsx
import React, { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import './PaymentSuccess.css';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();

  const paymentStatus = searchParams.get('payment_status');
  const amount = searchParams.get('amount');

  useEffect(() => {
    toast.success('Payment Successful! 🎉', {
      description: `Your payment of KES ${amount || '0'} was completed successfully.`,
      duration: 5000,
      icon: '✅',
    });
  }, [amount]);

  return (
    <div className="ps-wrapper">
      <div className="ps-card">
        <div className="ps-icon-container">
          <div className="ps-icon-ring">
            <div className="ps-icon-bg">
              <CheckCircle size={64} className="ps-check-icon" />
            </div>
          </div>
        </div>

        <h1 className="ps-title">Payment Successful! 🎉</h1>
        <p className="ps-subtitle">
          Your connection has been confirmed and is now active.
        </p>

        <div className="ps-details-grid">
          <div className="ps-detail-item">
            <span className="ps-detail-label">Amount Paid</span>
            <div className="ps-detail-value-group">
              <span className="ps-detail-value ps-amount-value">
                KES {amount || '0'}
              </span>
            </div>
          </div>

          <div className="ps-detail-item">
            <span className="ps-detail-label">Status</span>
            <div className="ps-detail-value-group">
              <span className="ps-detail-value ps-status-value">
                {paymentStatus || 'Completed'}
              </span>
            </div>
          </div>
        </div>

        <div className="ps-actions">
          <Link to="/user/dashboard" className="ps-btn-primary">
            <span>Go to Dashboard</span>
            <ArrowRight size={20} />
          </Link>
          <Link to="/" className="ps-btn-secondary">
            Return Home
          </Link>
        </div>

        <div className="ps-footer">
          <p>
            Need help? <a href="/contact">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;