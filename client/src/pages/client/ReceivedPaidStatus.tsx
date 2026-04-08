import { useState, useEffect } from 'react';
import { FaGrinHearts, FaCheckCircle, FaPhone, FaEnvelope, FaUser } from 'react-icons/fa';
import './StatusComponents.css';

interface Hookup {
  id: number;
  sender_name: string;
  paid_at: string | null;
  approved_at: string | null;
}

interface ReceivedPaidStatusProps {
  hookup: Hookup;
}

interface PartnerDetails {
  full_name: string;
  email: string;
  phone_number: string;
  role: string;
  hookup_status: string;
  payment_status: string;
  hookup_id: number;
}

const ReceivedPaidStatus: React.FC<ReceivedPaidStatusProps> = ({ hookup }) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [partnerDetails, setPartnerDetails] = useState<PartnerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPartnerDetails();
  }, [hookup.id]);

  const fetchPartnerDetails = async () => {
    try {
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookup.id}/partner-details/`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPartnerDetails(data);
      }
    } catch (error) {
      console.error('Failed to fetch partner details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="status-card status-received-paid">
        <div className="status-icon-wrapper">
          <FaGrinHearts className="status-icon" />
        </div>
        <div className="status-content">
          <div className="status-loading">
            <div className="loading-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
            <span className="loading-text">Loading contact details...</span>
          </div>
        </div>
      </div>
    );
  }

  const displayName = partnerDetails?.full_name || hookup.sender_name;

  return (
    <div className="status-card status-received-paid">
      <div className="status-icon-wrapper">
        <FaGrinHearts className="status-icon" />
      </div>
      <div className="status-content">
        <h4 className="status-title">Hookup Confirmed! 🎉</h4>
        <p className="status-description">
          Payment completed! Your hookup with <strong>{displayName}</strong> is confirmed.
        </p>
        
        {/* Sender Contact Details */}
        {partnerDetails && (
          <div className="partner-contact-details">
            <h5 className="partner-title">Contact Details</h5>
            <div className="partner-info">
              <div className="partner-info-item">
                <FaUser className="partner-info-icon" />
                <div>
                  <span className="partner-info-label">Full Name</span>
                  <span className="partner-info-value">{partnerDetails.full_name}</span>
                </div>
              </div>
              <div className="partner-info-item">
                <FaEnvelope className="partner-info-icon" />
                <div>
                  <span className="partner-info-label">Email</span>
                  <span className="partner-info-value">{partnerDetails.email}</span>
                </div>
              </div>
              <div className="partner-info-item">
                <FaPhone className="partner-info-icon" />
                <div>
                  <span className="partner-info-label">Phone Number</span>
                  <span className="partner-info-value">{partnerDetails.phone_number}</span>
                </div>
              </div>
            </div>
            <div className="partner-chat-message">
              <p>You can now chat via any platform using the contact details above.</p>
            </div>
          </div>
        )}
        
        <div className="status-success">
          <FaCheckCircle className="success-icon" />
          <span>Get ready for an amazing time! ✨</span>
        </div>
      </div>
    </div>
  );
};

export default ReceivedPaidStatus;