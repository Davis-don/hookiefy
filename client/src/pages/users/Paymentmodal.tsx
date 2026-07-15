import './paymentmodal.css'
import { usePaymentModalStore } from './store/modalstore'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import { toast } from 'sonner'

interface HookupFeeResponse {
  success: boolean;
  message: string;
  data: {
    hookup_fee: number;
    currency: string;
    assigned_admin: {
      id: number;
      name: string;
      email: string;
    };
  };
}

// Fetch hookup fee
const fetchHookupFee = async (accessToken: string | null): Promise<HookupFeeResponse> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const url = `${import.meta.env.VITE_API_URL}/administration/hookup-fee/`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    if (response.status === 403) {
      throw new Error('Access denied. Only regular users can access this.');
    }
    if (response.status === 404) {
      throw new Error('No assignment found. You are not assigned to any admin.');
    }
    throw new Error(`Failed to fetch hookup fee: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch hookup fee');
  }
  
  return data;
};

function Paymentmodal() {
  const { hookupId, close } = usePaymentModalStore();
  const { access: accessToken } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  // Fetch hookup fee using useQuery
  const {
    data: hookupFeeData,
    isLoading: isLoadingFee,
    isError: isFeeError,
    error: feeError,
    refetch: refetchFee,
  } = useQuery({
    queryKey: ['hookupFee', accessToken],
    queryFn: () => fetchHookupFee(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Show toast on error
  useEffect(() => {
    if (isFeeError && feeError) {
      const errorMessage = feeError instanceof Error ? feeError.message : 'Failed to load hookup fee';
      toast.error('Failed to load payment details', {
        description: errorMessage,
        duration: 5000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    }
  }, [isFeeError, feeError]);

  const handlePayment = async () => {
    if (selectedMethod === 'mpesa' && !phoneNumber) {
      setShowPhoneInput(true);
      toast.warning('Phone number required', {
        description: 'Please enter your M-Pesa phone number.',
        duration: 3000,
        icon: '📱',
        style: {
          background: '#1a1a2e',
          border: '1px solid #f59e0b',
          color: '#ffffff',
        },
      });
      return;
    }
    if (selectedMethod === 'card' && (!cardNumber || !expiryDate || !cvv)) {
      toast.warning('Card details required', {
        description: 'Please fill in all card details.',
        duration: 3000,
        icon: '💳',
        style: {
          background: '#1a1a2e',
          border: '1px solid #f59e0b',
          color: '#ffffff',
        },
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      toast.success('Payment successful!', {
        description: `Payment of KES ${hookupFeeData?.data.hookup_fee || '500'} processed successfully.`,
        duration: 4000,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      
      console.log(`Processing payment for hookup: ${hookupId} via ${selectedMethod}`);
    } catch (error) {
      toast.error('Payment failed', {
        description: 'An error occurred while processing your payment. Please try again.',
        duration: 4000,
        icon: '❌',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    } finally {
      setIsProcessing(false);
      close();
    }
  };

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
    if (method === 'mpesa') {
      setShowPhoneInput(true);
    } else {
      setShowPhoneInput(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    return formatted.slice(0, 19);
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  // Get the fee amount
  const feeAmount = hookupFeeData?.data?.hookup_fee || 500;
  const currency = hookupFeeData?.data?.currency || 'KES';
  const assignedAdmin = hookupFeeData?.data?.assigned_admin;

  // Loading state
  if (isLoadingFee) {
    return (
      <div className="payment-modal-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-card payment-modal-loading">
          <button className="payment-modal-close-btn" onClick={close}>
            ✕
          </button>
          <div className="payment-modal-loading-content">
            <div className="payment-modal-loading-spinner">
              <span className="payment-modal-loading-dot"></span>
              <span className="payment-modal-loading-dot"></span>
              <span className="payment-modal-loading-dot"></span>
            </div>
            <p className="payment-modal-loading-text">Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isFeeError) {
    return (
      <div className="payment-modal-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-card payment-modal-error">
          <button className="payment-modal-close-btn" onClick={close}>
            ✕
          </button>
          <div className="payment-modal-error-content">
            <span className="payment-modal-error-icon">⚠️</span>
            <h3 className="payment-modal-error-title">Failed to Load Payment</h3>
            <p className="payment-modal-error-message">
              {feeError instanceof Error ? feeError.message : 'Unable to fetch payment details.'}
            </p>
            <button 
              className="payment-modal-error-retry"
              onClick={() => refetchFee()}
            >
              Retry
            </button>
            <button 
              className="payment-modal-error-cancel"
              onClick={close}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-modal-wrapper" onClick={(e) => e.stopPropagation()}>
      <div className="payment-modal-card">
        {/* Close Button */}
        <button className="payment-modal-close-btn" onClick={close}>
          ✕
        </button>

        {/* Header */}
        <div className="payment-modal-header-section">
          <div className="payment-modal-icon-wrapper">
            <span className="payment-modal-icon">💳</span>
          </div>
          <h2 className="payment-modal-title">Secure Payment</h2>
          <p className="payment-modal-subtitle">Complete your hookup request</p>
        </div>

        {/* Divider */}
        <div className="payment-modal-divider"></div>

        {/* Amount */}
        <div className="payment-modal-amount-section">
          <span className="payment-modal-amount-label">Amount to Pay</span>
          <div className="payment-modal-amount-box">
            <span className="payment-modal-currency">{currency}</span>
            <span className="payment-modal-amount-value">{feeAmount}</span>
          </div>
          {assignedAdmin && (
            <span className="payment-modal-admin-info">
              Admin: {assignedAdmin.name}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="payment-modal-divider"></div>

        {/* Payment Method */}
        <div className="payment-modal-method-section">
          <h4 className="payment-modal-section-title">Select Payment Method</h4>
          
          <div className="payment-modal-method-options">
            {/* M-Pesa Option */}
            <div 
              className={`payment-modal-method-option ${selectedMethod === 'mpesa' ? 'payment-modal-method-active' : ''}`}
              onClick={() => handleMethodSelect('mpesa')}
            >
              <div className="payment-modal-method-left">
                <div className="payment-modal-method-icon-wrapper">
                  <span className="payment-modal-method-icon">📱</span>
                </div>
                <div>
                  <div className="payment-modal-method-name">M-Pesa</div>
                  <div className="payment-modal-method-desc">Pay with mobile money</div>
                </div>
              </div>
              {selectedMethod === 'mpesa' && (
                <span className="payment-modal-method-check">✓</span>
              )}
            </div>

            {/* Card Option */}
            <div 
              className={`payment-modal-method-option ${selectedMethod === 'card' ? 'payment-modal-method-active' : ''}`}
              onClick={() => handleMethodSelect('card')}
            >
              <div className="payment-modal-method-left">
                <div className="payment-modal-method-icon-wrapper">
                  <span className="payment-modal-method-icon">💳</span>
                </div>
                <div>
                  <div className="payment-modal-method-name">Card</div>
                  <div className="payment-modal-method-desc">Visa, Mastercard, Amex</div>
                </div>
              </div>
              {selectedMethod === 'card' && (
                <span className="payment-modal-method-check">✓</span>
              )}
            </div>

            {/* Bank Option */}
            <div 
              className={`payment-modal-method-option ${selectedMethod === 'bank' ? 'payment-modal-method-active' : ''}`}
              onClick={() => handleMethodSelect('bank')}
            >
              <div className="payment-modal-method-left">
                <div className="payment-modal-method-icon-wrapper">
                  <span className="payment-modal-method-icon">🏦</span>
                </div>
                <div>
                  <div className="payment-modal-method-name">Bank Transfer</div>
                  <div className="payment-modal-method-desc">Direct bank payment</div>
                </div>
              </div>
              {selectedMethod === 'bank' && (
                <span className="payment-modal-method-check">✓</span>
              )}
            </div>
          </div>
        </div>

        {/* Phone Input for M-Pesa */}
        {showPhoneInput && selectedMethod === 'mpesa' && (
          <div className="payment-modal-input-section">
            <label className="payment-modal-input-label">M-Pesa Phone Number</label>
            <div className="payment-modal-input-field">
              <span className="payment-modal-input-prefix">+254</span>
              <input 
                type="tel" 
                className="payment-modal-input"
                placeholder="701 234 567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
              />
            </div>
            <p className="payment-modal-input-hint">You'll receive a prompt to confirm payment on your phone</p>
          </div>
        )}

        {/* Card Input Fields */}
        {selectedMethod === 'card' && (
          <div className="payment-modal-input-section">
            <label className="payment-modal-input-label">Card Number</label>
            <div className="payment-modal-input-field">
              <input 
                type="text" 
                className="payment-modal-input"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
              />
              <span className="payment-modal-input-icon">💳</span>
            </div>

            <div className="payment-modal-input-row">
              <div className="payment-modal-input-group">
                <label className="payment-modal-input-label">Expiry Date</label>
                <input 
                  type="text" 
                  className="payment-modal-input"
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiry(e.target.value))}
                  maxLength={5}
                />
              </div>
              <div className="payment-modal-input-group">
                <label className="payment-modal-input-label">CVV</label>
                <input 
                  type="password" 
                  className="payment-modal-input"
                  placeholder="•••"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                />
              </div>
            </div>
          </div>
        )}

        {/* Bank Transfer Info */}
        {selectedMethod === 'bank' && (
          <div className="payment-modal-bank-info">
            <div className="payment-modal-bank-item">
              <span className="payment-modal-bank-label">Bank</span>
              <span className="payment-modal-bank-value">Equity Bank</span>
            </div>
            <div className="payment-modal-bank-item">
              <span className="payment-modal-bank-label">Account Name</span>
              <span className="payment-modal-bank-value">Hookiefy Payments</span>
            </div>
            <div className="payment-modal-bank-item">
              <span className="payment-modal-bank-label">Account Number</span>
              <span className="payment-modal-bank-value">1234567890</span>
            </div>
            <div className="payment-modal-bank-item">
              <span className="payment-modal-bank-label">Reference</span>
              <span className="payment-modal-bank-value">HKY-{hookupId?.slice(0, 6).toUpperCase()}</span>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="payment-modal-divider"></div>

        {/* Summary */}
        <div className="payment-modal-summary">
          <div className="payment-modal-summary-row">
            <span>Subtotal</span>
            <span>{currency} {feeAmount}</span>
          </div>
          <div className="payment-modal-summary-row">
            <span>Service Fee</span>
            <span className="payment-modal-summary-free">Free</span>
          </div>
          <div className="payment-modal-summary-total">
            <span>Total</span>
            <span className="payment-modal-summary-total-amount">{currency} {feeAmount}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="payment-modal-divider"></div>

        {/* Action Buttons */}
        <div className="payment-modal-actions">
          <button className="payment-modal-btn payment-modal-btn-cancel" onClick={close} disabled={isProcessing}>
            Cancel
          </button>
          <button 
            className="payment-modal-btn payment-modal-btn-pay" 
            onClick={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <span className="payment-modal-spinner">
                <span className="payment-modal-spinner-dot"></span>
                <span className="payment-modal-spinner-dot"></span>
                <span className="payment-modal-spinner-dot"></span>
              </span>
            ) : (
              'Pay Now'
            )}
          </button>
        </div>

        {/* Security Footer */}
        <div className="payment-modal-security">
          <span className="payment-modal-security-icon">🔒</span>
          <span>Secure encrypted payment • 100% protected</span>
        </div>
      </div>
    </div>
  )
}

export default Paymentmodal