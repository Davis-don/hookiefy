import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaTimes, FaArrowRight, FaCreditCard, FaPaypal, FaMobileAlt } from 'react-icons/fa';
import { toast } from '../../store/Toaststore';
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

const PaymentModal: React.FC<PaymentModalProps> = ({ hookup, onClose, onSuccess }) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);

  const paymentMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookup.id}/mark-paid/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process payment');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Payment successful! Your hookup is confirmed.', {
        title: '✓ Payment Complete',
        icon: '🎉',
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['my-hookups'] });
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to process payment. Please try again.', {
        title: '❌ Payment Failed',
        icon: '⚠️',
        duration: 4000,
      });
      setIsProcessing(false);
    },
  });

  const handleSubmitPayment = () => {
    paymentMutation.mutate();
  };

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="payment-modal-close" onClick={onClose}>
          <FaTimes />
        </button>

        <div className="payment-modal-icon">
          <FaCreditCard />
        </div>

        <h3 className="payment-modal-title">Complete Payment</h3>
        
        <p className="payment-modal-description">
          Confirm your hookup with <strong>{hookup.receiver_name || 'the recipient'}</strong>
        </p>

        <div className="payment-amount-box">
          <span className="payment-amount-label">Total Amount</span>
          <span className="payment-amount-value">$49.99</span>
        </div>

        <div className="payment-methods">
          <div 
            className={`payment-method-option ${selectedMethod === 'card' ? 'active' : ''}`}
            onClick={() => setSelectedMethod('card')}
          >
            <input type="radio" checked={selectedMethod === 'card'} readOnly />
            <FaCreditCard className="payment-method-icon" />
            <div className="payment-method-info">
              <span className="payment-method-name">Credit / Debit Card</span>
              <span className="payment-method-desc">Visa, Mastercard, Amex</span>
            </div>
          </div>

          <div 
            className={`payment-method-option ${selectedMethod === 'paypal' ? 'active' : ''}`}
            onClick={() => setSelectedMethod('paypal')}
          >
            <input type="radio" checked={selectedMethod === 'paypal'} readOnly />
            <FaPaypal className="payment-method-icon" />
            <div className="payment-method-info">
              <span className="payment-method-name">PayPal</span>
              <span className="payment-method-desc">Fast & secure</span>
            </div>
          </div>

          <div 
            className={`payment-method-option ${selectedMethod === 'mpesa' ? 'active' : ''}`}
            onClick={() => setSelectedMethod('mpesa')}
          >
            <input type="radio" checked={selectedMethod === 'mpesa'} readOnly />
            <FaMobileAlt className="payment-method-icon" />
            <div className="payment-method-info">
              <span className="payment-method-name">M-Pesa</span>
              <span className="payment-method-desc">Mobile money</span>
            </div>
          </div>
        </div>

        <div className="payment-modal-actions">
          <button className="payment-cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="payment-confirm-button" 
            onClick={handleSubmitPayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              'Processing...'
            ) : (
              <>
                Pay Now
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