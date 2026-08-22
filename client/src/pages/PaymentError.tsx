import React, { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import './PaymentPages.css';

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
    <div className="payment-page-container">
      <div className="payment-page-card error-card">
        <div className="payment-page-icon error-icon">
          <AlertTriangle size={64} />
        </div>
        
        <h1 className="payment-page-title">Payment Error ⚠️</h1>
        <p className="payment-page-subtitle">
          {errorMessage || 'An unexpected error occurred while processing your payment.'}
        </p>

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

export default PaymentError;