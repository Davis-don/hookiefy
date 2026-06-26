import './paymentmodal.css'
import { usePaymentModalStore } from './store/modalstore'
import { useState } from 'react'

function Paymentmodal() {
  const { hookupId, close } = usePaymentModalStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const handlePayment = async () => {
    if (selectedMethod === 'mpesa' && !phoneNumber) {
      setShowPhoneInput(true);
      return;
    }
    if (selectedMethod === 'card' && (!cardNumber || !expiryDate || !cvv)) {
      return;
    }

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2500));
    console.log(`Processing payment for hookup: ${hookupId} via ${selectedMethod}`);
    setIsProcessing(false);
    close();
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
            <span className="payment-modal-currency">KES</span>
            <span className="payment-modal-amount-value">500</span>
          </div>
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
            <span>KES 500</span>
          </div>
          <div className="payment-modal-summary-row">
            <span>Service Fee</span>
            <span className="payment-modal-summary-free">Free</span>
          </div>
          <div className="payment-modal-summary-total">
            <span>Total</span>
            <span className="payment-modal-summary-total-amount">KES 500</span>
          </div>
        </div>

        {/* Divider */}
        <div className="payment-modal-divider"></div>

        {/* Action Buttons */}
        <div className="payment-modal-actions">
          <button className="payment-modal-btn payment-modal-btn-cancel" onClick={close}>
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