// PaymentError.tsx
import React, { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import './PaymentError.css';

const PaymentError: React.FC = () => {
  const [searchParams] = useSearchParams();
  const errorMessage = searchParams.get('message');

  useEffect(() => {
    toast.error('Payment Error', {
      description: errorMessage || 'An unexpected error occurred.',
      duration: 6000,
      icon: '⚠️',
    });
  }, [errorMessage]);

  return (
    <div className="pe-wrapper">
      <div className="pe-card">
        <div className="pe-icon-container">
          <div className="pe-icon-ring">
            <div className="pe-icon-bg">
              <AlertTriangle size={64} className="pe-alert-icon" />
            </div>
          </div>
        </div>
        
        <h1 className="pe-title">Payment Error ⚠️</h1>
        <p className="pe-subtitle">
          {errorMessage || 'An unexpected error occurred while processing your payment.'}
        </p>

        <div className="pe-actions">
          <Link to="/user/dashboard" className="pe-btn-primary">
            <span>Go to Dashboard</span>
            <ArrowRight size={20} />
          </Link>
          <Link to="/" className="pe-btn-secondary">
            Return Home
          </Link>
        </div>

        <div className="pe-footer">
          <p>Need help? <a href="/contact">Contact Support</a></p>
        </div>
      </div>
    </div>
  );
};

export default PaymentError;