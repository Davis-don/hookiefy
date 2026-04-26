import './clentaccountsetprofile.css';
import { BsInfoLg, BsArrowRight } from "react-icons/bs";
import { useState } from 'react';
import Clientbioupload from './Clientbioupload';

interface ClientaccountsetprofileProps {
  onProfileComplete?: () => void;
}

function Clientaccountsetprofile({ onProfileComplete }: ClientaccountsetprofileProps) {
    const [alertVisible, setAlertVisible] = useState(true);

    const handleSetupClick = () => {
        setAlertVisible(false);
    };

    const handleBioUpdateSuccess = () => {
        // Notify parent component that profile is complete
        if (onProfileComplete) {
            onProfileComplete();
        }
    };

    return (
        <div className="hookify-client-profile-container">
            {!alertVisible && <Clientbioupload onBioUpdateSuccess={handleBioUpdateSuccess} />}
            
            {alertVisible && (
                <div className="hookify-profile-alert-card">
                    {/* Animated Info Icon */}
                    <div className="hookify-alert-icon-wrapper">
                        <div className="hookify-alert-icon-animation">
                            <BsInfoLg className="hookify-alert-icon" />
                            <div className="hookify-alert-icon-pulse"></div>
                        </div>
                    </div>
                    
                    {/* Alert Content */}
                    <div className="hookify-alert-content">
                        <h2 className="hookify-alert-title">
                            Complete Your Profile Setup
                        </h2>
                        
                        <p className="hookify-alert-text">
                            You need to complete your profile setup with your contact details to continue. 
                            This helps us verify your identity and ensure a safe and secure experience.
                        </p>
                        
                        {/* CTA Button */}
                        <button 
                            className="hookify-alert-button"
                            onClick={handleSetupClick}
                        >
                            <span>Setup Your Profile Now</span>
                            <BsArrowRight className="hookify-button-icon" />
                        </button>
                        
                        {/* Security note */}
                        <p className="hookify-alert-note">
                            🔒 Your information is secure and will only be used for verification purposes
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Clientaccountsetprofile;