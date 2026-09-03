// Paymentmodal.tsx - Updated for PesaPal
// ============================================================
// Paymentmodal.tsx - PesaPal Payment Modal
// ============================================================

import './paymentmodal.css'
import { usePaymentModalStore } from '../store/modalstore'
import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore'
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
    user: {
      id: number;
      phone_number: string | null;
      email: string;
      full_name: string;
    };
  };
}

interface PesaPalPaymentInitResponse {
  success: boolean;
  message: string;
  payment: {
    id: number;
    merchant_reference: string;
    amount: number;
    status: string;
    gateway: string;
  };
  redirect_url: string;
  payment_id: string;
  order_tracking_id?: string;
}

// PesaPal configuration
const PESAPAL_CONFIG = {
  // Your registered IPN ID
  IPN_ID: 'e27e0fda-86d5-4c82-a79f-da24fcc9aad4',
  // Gateway identifier as stored in database
  GATEWAY: 'pesapal',
};

// Fetch hookup fee - gets the fee and user details
const fetchHookupFee = async (
  accessToken: string | null
): Promise<HookupFeeResponse> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const url = `${import.meta.env.VITE_API_URL}/administration/hookup-fee/`;

  console.log('📡 Fetching hookup fee from:', url);

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
  
  console.log('✅ Hookup fee data received:', data);
  return data;
};

// Initiate PesaPal payment
const initiatePesaPalPayment = async ({
  accessToken,
  connectionId,
  phoneNumber,
  email,
  amount,
  fullName,
}: {
  accessToken: string;
  connectionId: string;
  phoneNumber: string;
  email: string;
  amount: number;
  fullName: string;
}): Promise<PesaPalPaymentInitResponse> => {
  // Generate merchant reference
  const timestamp = Date.now();
  const shortId = connectionId.slice(0, 8);
  const merchantReference = `HOOK-${shortId}-${timestamp}`;

  const payload = {
    // Payment details matching the Payment model
    merchant_reference: merchantReference,
    amount: amount,
    phone_number: phoneNumber,
    email: email,
    full_name: fullName,
    
    // Connection and gateway info
    connection_id: connectionId,
    gateway: PESAPAL_CONFIG.GATEWAY,
    
    // PesaPal specific
    ipn_id: PESAPAL_CONFIG.IPN_ID,
    callback_url: `${window.location.origin}/payment-callback`,
    
    // Customer info for PesaPal
    customer_name: fullName,
    customer_email: email,
    customer_phone: phoneNumber,
    
    // Additional metadata
    description: `Hookup fee payment for connection ${shortId}`,
  };

  console.log('📤 Initiating PesaPal payment with payload:', payload);
  console.log('🏷️ Gateway:', PESAPAL_CONFIG.GATEWAY);
  console.log('🔗 IPN ID:', PESAPAL_CONFIG.IPN_ID);

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/initiate-payment/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ PesaPal payment initiation failed:', errorData);
      
      // Handle specific error cases
      if (response.status === 400) {
        throw new Error(errorData.message || 'Invalid payment request. Please check your details.');
      } else if (response.status === 401) {
        throw new Error('Session expired. Please login again.');
      } else if (response.status === 403) {
        throw new Error('You do not have permission to make this payment.');
      } else if (response.status === 404) {
        throw new Error('Payment service temporarily unavailable. Please try again.');
      } else if (response.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      throw new Error(errorData.message || `Payment initiation failed (${response.status})`);
    }

    const data = await response.json();
    console.log('✅ PesaPal payment initiated successfully:', data);
    console.log('📝 Merchant Reference:', data.payment?.merchant_reference);
    console.log('📝 Gateway:', data.payment?.gateway);
    return data;
  } catch (error) {
    console.error('❌ PesaPal payment initiation error:', error);
    throw error;
  }
};

function Paymentmodal() {
  const { hookupId, close, isMount } = usePaymentModalStore();
  const { access: accessToken } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);

  // Debug logging
  console.log('💳 PaymentModal rendering');
  console.log('📂 isMount:', isMount);
  console.log('🔑 hookupId from store (connection_id):', hookupId);

  // If modal is not mounted, don't render anything
  if (!isMount) {
    console.log('🚫 PaymentModal: Not mounted, returning null');
    return null;
  }

  // Fetch hookup fee - doesn't need connection_id
  const {
    data: hookupFeeData,
    isLoading: isLoadingFee,
    isError: isFeeError,
    error: feeError,
    refetch: refetchFee,
  } = useQuery({
    queryKey: ['hookupFee', accessToken],
    queryFn: () => fetchHookupFee(accessToken),
    enabled: !!accessToken && isMount,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // PesaPal payment mutation
  const paymentMutation = useMutation({
    mutationFn: initiatePesaPalPayment,
    onSuccess: (data) => {
      toast.success('Payment initiated!', {
        description: `Redirecting to PesaPal checkout (${PESAPAL_CONFIG.GATEWAY})...`,
        duration: 3000,
        icon: '🔄',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });

      // Redirect to PesaPal checkout URL
      if (data.redirect_url) {
        console.log('🔀 Redirecting to PesaPal:', data.redirect_url);
        console.log('📋 Payment ID:', data.payment_id);
        console.log('📋 Merchant Reference:', data.payment?.merchant_reference);
        console.log('📋 Gateway:', data.payment?.gateway);
        console.log('📋 Order Tracking ID:', data.order_tracking_id);
        
        // Store payment info in sessionStorage for recovery
        try {
          const paymentInfo = {
            payment_id: data.payment_id,
            merchant_reference: data.payment?.merchant_reference || '',
            connection_id: hookupId || '',
            gateway: data.payment?.gateway || PESAPAL_CONFIG.GATEWAY,
            amount: data.payment?.amount || 0,
            timestamp: Date.now(),
          };
          sessionStorage.setItem('pesapal_payment_info', JSON.stringify(paymentInfo));
          console.log('💾 Payment info stored in sessionStorage:', paymentInfo);
        } catch (e) {
          console.warn('Could not store payment info in sessionStorage:', e);
        }
        
        // Redirect to PesaPal
        window.location.replace(data.redirect_url);
      } else {
        console.error('❌ No redirect_url in response:', data);
        toast.error('No redirect URL received', {
          description: 'Please contact support.',
          duration: 4000,
          icon: '❌',
          style: {
            background: '#1a1a2e',
            border: '1px solid #ef4444',
            color: '#ffffff',
          },
        });
        setIsProcessing(false);
      }
    },
    onError: (error) => {
      console.error('❌ Payment mutation error:', error);
      
      let errorMessage = 'Please try again.';
      let errorDescription = 'Payment initiation failed.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        // Provide more user-friendly messages
        if (error.message.includes('Session expired')) {
          errorDescription = 'Your session has expired. Please login again.';
        } else if (error.message.includes('permission')) {
          errorDescription = 'You do not have permission to make this payment.';
        } else if (error.message.includes('service unavailable')) {
          errorDescription = 'The payment service is temporarily unavailable. Please try again later.';
        } else if (error.message.includes('Invalid payment')) {
          errorDescription = 'Please check your payment details and try again.';
        } else {
          errorDescription = error.message;
        }
      }
      
      toast.error(errorDescription, {
        description: errorMessage,
        duration: 4000,
        icon: '❌',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      setIsProcessing(false);
    },
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
    console.log('🔄 handlePayment called');
    
    // Get connection_id from the store
    const connectionId = hookupId;
    
    console.log('🔑 Connection ID from store:', connectionId);

    // Check if we have connection_id
    if (!connectionId) {
      console.error('❌ No connection ID found in store');
      toast.error('Connection ID not found', {
        description: 'Unable to process payment. Please try again.',
        duration: 3000,
        icon: '❌',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    if (!hookupFeeData?.data) {
      console.error('❌ No hookup fee data available');
      toast.error('Payment details not available', {
        description: 'Please refresh and try again.',
        duration: 3000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    const { user } = hookupFeeData.data;
    
    console.log('👤 User data from hookup fee:', user);

    // Get user full name from hookup fee data
    const fullName = user?.full_name || user?.email?.split('@')[0] || 'Customer';
    
    // Auto-fetch phone number from user data
    const phoneNumber = user?.phone_number;
    const email = user?.email;
    
    if (!phoneNumber) {
      console.error('❌ No phone number found for user');
      toast.error('Phone number not found', {
        description: 'Please update your phone number in profile settings.',
        duration: 4000,
        icon: '📱',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    if (!email) {
      console.error('❌ No email found for user');
      toast.error('Email not found', {
        description: 'Please update your email in profile settings.',
        duration: 4000,
        icon: '📧',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    // Format phone number (ensure it starts with 254)
    let formattedPhone = phoneNumber;
    
    // Remove any leading + or 0
    formattedPhone = formattedPhone.replace(/^\+/, '');
    formattedPhone = formattedPhone.replace(/^0/, '');
    
    // Ensure it starts with 254
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = `254${formattedPhone}`;
    }

    // Get the fee amount
    const feeAmount = hookupFeeData.data.hookup_fee || 500;

    console.log('📱 Original phone number:', phoneNumber);
    console.log('📱 Formatted phone number:', formattedPhone);
    console.log('📧 Email:', email);
    console.log('👤 Full Name:', fullName);
    console.log('🔑 Connection ID for payment:', connectionId);
    console.log('💰 Amount:', feeAmount);
    console.log('🏷️ Gateway:', PESAPAL_CONFIG.GATEWAY);
    console.log('🔗 IPN ID:', PESAPAL_CONFIG.IPN_ID);

    setIsProcessing(true);

    try {
      await paymentMutation.mutateAsync({
        accessToken: accessToken!,
        connectionId: connectionId,
        phoneNumber: formattedPhone,
        email: email,
        amount: feeAmount,
        fullName: fullName,
      });
    } catch (error) {
      // Error is handled in mutation's onError
      console.error('❌ Payment error:', error);
      setIsProcessing(false);
    }
  };

  // Get the fee amount for display only
  const feeAmount = hookupFeeData?.data?.hookup_fee || 500;
  const currency = hookupFeeData?.data?.currency || 'KES';
  const assignedAdmin = hookupFeeData?.data?.assigned_admin;
  const userPhoneNumber = hookupFeeData?.data?.user?.phone_number;
  const userEmail = hookupFeeData?.data?.user?.email;
  const userFullName = hookupFeeData?.data?.user?.full_name;

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
          <h2 className="payment-modal-title">Pay with PesaPal</h2>
          <p className="payment-modal-subtitle">Complete your hookup request securely</p>
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
              👤 Admin: {assignedAdmin.name}
            </span>
          )}
          {userFullName && (
            <span className="payment-modal-name-info">
              👤 Name: {userFullName}
            </span>
          )}
          {userPhoneNumber && (
            <span className="payment-modal-phone-info">
              📱 Phone: {userPhoneNumber}
            </span>
          )}
          {userEmail && (
            <span className="payment-modal-email-info">
              📧 Email: {userEmail}
            </span>
          )}
          {hookupId && (
            <span className="payment-modal-connection-info">
              🔗 Connection: {hookupId.slice(0, 8)}...
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="payment-modal-divider"></div>

        {/* Payment Method - Simplified since user just clicks pay */}
        <div className="payment-modal-method-section">
          <h4 className="payment-modal-section-title">Payment Details</h4>
          
          <div className="payment-modal-info-box">
            <div className="payment-modal-info-row">
              <span className="payment-modal-info-label">Payment Method</span>
              <span className="payment-modal-info-value">Mobile Money / Bank Transfer</span>
            </div>
            <div className="payment-modal-info-row">
              <span className="payment-modal-info-label">Gateway</span>
              <span className="payment-modal-info-value">
                <span className="payment-modal-gateway-badge">PesaPal</span>
              </span>
            </div>
            {userFullName && (
              <div className="payment-modal-info-row">
                <span className="payment-modal-info-label">Name</span>
                <span className="payment-modal-info-value">{userFullName}</span>
              </div>
            )}
            {userEmail && (
              <div className="payment-modal-info-row">
                <span className="payment-modal-info-label">Email</span>
                <span className="payment-modal-info-value">{userEmail}</span>
              </div>
            )}
            {userPhoneNumber && (
              <div className="payment-modal-info-row">
                <span className="payment-modal-info-label">Phone</span>
                <span className="payment-modal-info-value">{userPhoneNumber}</span>
              </div>
            )}
            {hookupId && (
              <div className="payment-modal-info-row">
                <span className="payment-modal-info-label">Reference</span>
                <span className="payment-modal-info-value">
                  {hookupId.slice(0, 8)}...
                </span>
              </div>
            )}
          </div>
          
          <p className="payment-modal-info-hint">
            🔒 Secure payment powered by PesaPal
          </p>
        </div>

        {/* Divider */}
        <div className="payment-modal-divider"></div>

        {/* Summary */}
        <div className="payment-modal-summary">
          <div className="payment-modal-summary-row">
            <span>Hookup Fee</span>
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
            disabled={isProcessing || !hookupId || !userPhoneNumber || !userEmail}
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
          <span>Secure encrypted payment • Powered by PesaPal</span>
        </div>
      </div>
    </div>
  )
}

export default Paymentmodal