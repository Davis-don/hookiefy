import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaTimes, FaArrowRight, FaSpinner, FaShieldAlt, FaLock } from 'react-icons/fa';
import { toast } from '../../store/Toaststore';
import Spinner from '../../components/protected/protectedspinner/Spinner';
import './paymentmodal.css'

interface Hookup {
  id: number;
  receiver_name?: string;
}

interface PaymentModalProps {
  hookup: Hookup;
  onClose: () => void;
  onSuccess: () => void;
}

interface ClientConfig {
  id: number;
  hookup_fee: string;
  updated_by: number;
  updated_by_email: string;
  updated_at: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ hookup, onClose }) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch hookup fee from admin config
  const { 
    data: configData, 
    isLoading: isLoadingConfig, 
    error: configError 
  } = useQuery<ClientConfig>({
    queryKey: ['client-config'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/adminconfig/get/`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Configuration not found');
        }
        throw new Error('Failed to fetch configuration');
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const hookupFee = configData?.hookup_fee || '0.00';

  // Format amount in KSH
  const formatKSH = (amount: string) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(amount));
  };

  // Handle PesaPal payment
  const handlePesaPalPayment = () => {
    setIsProcessing(true);
    
    // Simulate payment processing - will be replaced with actual PesaPal integration
    setTimeout(() => {
      setIsProcessing(false);
      toast.info('Payment processing will be handled by PesaPal. This feature is coming soon!', {
        title: 'Coming Soon',
        icon: '🏦',
        duration: 5000,
      });
    }, 1500);
  };

  // Loading state
  if (isLoadingConfig) {
    return (
      <div className="payment-modal-overlay" onClick={onClose}>
        <div className="payment-modal-container" onClick={(e) => e.stopPropagation()}>
          <button className="payment-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
          <div className="payment-loading-state">
            <Spinner size="medium" color="#c41e3a" message="Loading payment details..." />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (configError) {
    return (
      <div className="payment-modal-overlay" onClick={onClose}>
        <div className="payment-modal-container" onClick={(e) => e.stopPropagation()}>
          <button className="payment-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
          <div className="payment-error-state">
            <div className="payment-error-icon">⚠️</div>
            <h4>Unable to load payment details</h4>
            <p>Please try again later</p>
            <button className="payment-retry-btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="payment-modal-close" onClick={onClose}>
          <FaTimes />
        </button>

        <div className="payment-modal-icon">
          <span className="pesapal-icon-text">PesaPal</span>
        </div>

        <h3 className="payment-modal-title">Complete Payment via PesaPal</h3>
        
        <p className="payment-modal-description">
          Confirm your hookup with <strong>{hookup.receiver_name || 'the recipient'}</strong>
        </p>

        <div className="payment-amount-box">
          <span className="payment-amount-label">Total Amount</span>
          <span className="payment-amount-value">{formatKSH(hookupFee)}</span>
        </div>

        <div className="payment-info-section">
          <div className="payment-info-item">
            <FaLock className="payment-info-icon" />
            <div className="payment-info-content">
              <strong>Secure Payment</strong>
              <p>Your transaction is encrypted and secure</p>
            </div>
          </div>
          <div className="payment-info-item">
            <FaShieldAlt className="payment-info-icon" />
            <div className="payment-info-content">
              <strong>Trusted Partner</strong>
              <p>PesaPal is a leading payment gateway in Africa</p>
            </div>
          </div>
        </div>

        <div className="payment-note">
          <p>You will be redirected to PesaPal's secure payment page to complete your transaction.</p>
        </div>

        <div className="payment-modal-actions">
          <button className="payment-cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="payment-confirm-button" 
            onClick={handlePesaPalPayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <FaSpinner className="spinner-icon" />
                Processing...
              </>
            ) : (
              <>
                Pay with PesaPal
                <FaArrowRight />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;