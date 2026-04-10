import { FaTimes, FaLock, FaShieldAlt, FaCreditCard } from 'react-icons/fa';
import './paymentmodal.css';

interface PesaPalModalProps {
  isOpen: boolean;
  amount: string;
  hookupId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const PesaPalModal: React.FC<PesaPalModalProps> = ({ isOpen, amount, hookupId, onClose, onSuccess }) => {
  if (!isOpen) return null;

  const formatKSH = (amount: string) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(amount));
  };

  const handleInitiatePayment = () => {
    // This will be implemented with actual PesaPal API integration
    console.log('Initiating PesaPal payment for:', { amount, hookupId });
    // For now, just show a message and close
    onSuccess();
  };

  return (
    <div className="pesapal-modal-overlay" onClick={onClose}>
      <div className="pesapal-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="pesapal-modal-close" onClick={onClose}>
          <FaTimes />
        </button>

        <div className="pesapal-modal-header">
          <div className="pesapal-icon-wrapper">
            <span className="pesapal-logo">PesaPal</span>
          </div>
          <h2 className="pesapal-modal-title">PesaPal Payment Integration</h2>
        </div>

        <div className="pesapal-modal-body">
          <div className="pesapal-amount-section">
            <span className="pesapal-amount-label">Amount to Pay</span>
            <div className="pesapal-amount-value">{formatKSH(amount)}</div>
          </div>

          <div className="pesapal-info-section">
            <div className="pesapal-info-item">
              <FaLock className="pesapal-info-icon" />
              <div className="pesapal-info-content">
                <strong>Secure Payment</strong>
                <p>Your payment is encrypted and secure</p>
              </div>
            </div>
            <div className="pesapal-info-item">
              <FaShieldAlt className="pesapal-info-icon" />
              <div className="pesapal-info-content">
                <strong>Trusted Partner</strong>
                <p>PesaPal is a leading payment gateway in Africa</p>
              </div>
            </div>
            <div className="pesapal-info-item">
              <FaCreditCard className="pesapal-info-icon" />
              <div className="pesapal-info-content">
                <strong>Multiple Payment Methods</strong>
                <p>Card, Mobile Money, Bank Transfer</p>
              </div>
            </div>
          </div>

          <div className="pesapal-note">
            <p>You will be redirected to PesaPal's secure payment page to complete your transaction.</p>
          </div>
        </div>

        <div className="pesapal-modal-actions">
          <button className="pesapal-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="pesapal-pay-btn" onClick={handleInitiatePayment}>
            Proceed to PesaPal
          </button>
        </div>
      </div>
    </div>
  );
};

export default PesaPalModal;