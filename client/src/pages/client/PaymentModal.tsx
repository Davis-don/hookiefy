import { useState, useEffect } from 'react';
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

interface PaymentResponse {
  success: boolean;
  message: string;
  redirect_url: string;
  order_tracking_id: string;
  merchant_reference: string;
  payment_id: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ hookup, onClose, onSuccess }) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

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

  // Poll payment status (runs in background after redirect)
  const pollPaymentStatus = async (orderTrackingId: string) => {
    const maxAttempts = 60; // 60 attempts (3 minutes)
    const interval = 3000; // 3 seconds
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, interval));
        
        const response = await fetch(`${apiUrl}/payments/status/${orderTrackingId}/`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'completed') {
            toast.success('Payment confirmed!', {
              title: 'Success',
              duration: 3000,
            });
            onSuccess();
            onClose();
            return true;
          } else if (data.status === 'failed') {
            toast.error('Payment failed', {
              title: 'Error',
              duration: 3000,
            });
            return false;
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }
    return false;
  };

  // Handle PesaPal payment - REDIRECT to new page
  const handlePesaPalPayment = async () => {
    setIsProcessing(true);
    
    try {
      // Validate phone number
      if (!phoneNumber || phoneNumber.length < 10) {
        toast.error('Please enter a valid phone number', {
          title: 'Validation Error',
          duration: 3000,
        });
        setIsProcessing(false);
        return;
      }

      // Show info toast
      toast.info('Creating payment request...', {
        title: 'Processing',
        duration: 2000,
      });

      // Make API call to create payment
      const response = await fetch(`${apiUrl}/payments/make-payment/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          hookup_id: hookup.id,
          phone: phoneNumber
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment initiation failed');
      }

      const data: PaymentResponse = await response.json();
      
      if (data.success && data.redirect_url) {
        // Store payment info in session storage for later reference
        sessionStorage.setItem('current_payment', JSON.stringify({
          order_tracking_id: data.order_tracking_id,
          merchant_reference: data.merchant_reference,
          payment_id: data.payment_id,
          hookup_id: hookup.id
        }));
        
        // Store the order tracking ID for polling after return
        sessionStorage.setItem('pending_payment_id', data.order_tracking_id);
        
        // Show message before redirect
        toast.info('Redirecting to PesaPal payment page...', {
          title: 'Redirecting',
          duration: 2000,
        });
        
        // Small delay to show the toast, then redirect
        setTimeout(() => {
          // Redirect to PesaPal payment page
          window.location.href = data.redirect_url;
        }, 1000);
        
        // Note: The code after redirect won't execute because the page unloads
        // The polling will happen when the user returns to the page
        
      } else {
        throw new Error('Invalid response from payment gateway');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment processing failed', {
        title: 'Payment Error',
        duration: 5000,
      });
      setIsProcessing(false);
    }
  };

  // Check for pending payment when component mounts (for when user returns from redirect)
    useEffect(() => {
      const pendingPaymentId = sessionStorage.getItem('pending_payment_id');
      if (pendingPaymentId) {
        // Clear it first to avoid duplicate polling
        sessionStorage.removeItem('pending_payment_id');
        // Poll for status
        pollPaymentStatus(pendingPaymentId);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

        {/* Phone Number Input */}
        <div className="payment-phone-input">
          <label htmlFor="phone">Phone Number (M-Pesa)</label>
          <input
            type="tel"
            id="phone"
            placeholder="0712345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="payment-phone-field"
          />
          <small>Enter the phone number registered with M-Pesa</small>
        </div>

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
          <p>You will be redirected to PesaPal's secure payment page to complete your transaction. After payment, you will be automatically redirected back.</p>
        </div>

        <div className="payment-modal-actions">
          <button className="payment-cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="payment-confirm-button" 
            onClick={handlePesaPalPayment}
            disabled={isProcessing || !phoneNumber}
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