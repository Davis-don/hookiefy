import { useState } from 'react';
import { FaCheckCircle, FaMoneyBillWave, FaArrowRight } from 'react-icons/fa';
import PaymentModal from './PaymentModal';
import './StatusComponents.css';

interface Hookup {
  id: number;
  approved_at: string | null;
  payment_status: string;
  receiver_name?: string;
}

interface ApprovedStatusProps {
  hookup: Hookup;
  onRefresh?: () => void;
}

const ApprovedStatus: React.FC<ApprovedStatusProps> = ({ hookup, onRefresh }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleProceedToPayment = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    if (onRefresh) onRefresh();
  };

  return (
    <>
      <div className="status-card status-approved">
        <div className="status-icon-wrapper">
          <FaCheckCircle className="status-icon" />
        </div>
        <div className="status-content">
          <h4 className="status-title">Request Approved! ✓</h4>
          <p className="status-description">
            Your hookup request has been accepted!
          </p>
          <button 
            className="status-payment-btn status-payment-btn-standout" 
            onClick={handleProceedToPayment}
          >
            <FaMoneyBillWave className="btn-icon" />
            <span>Complete Payment to Confirm</span>
            <FaArrowRight className="btn-arrow" />
            <span className="btn-pulse"></span>
          </button>
          <div className="status-warning">
            <FaMoneyBillWave className="warning-icon" />
            <span>Payment required to confirm your hookup</span>
          </div>
        </div>
      </div>

      {/* Payment Modal Component */}
      {showPaymentModal && (
        <PaymentModal
          hookup={hookup}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
};

export default ApprovedStatus;