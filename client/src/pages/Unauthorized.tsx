import React from 'react';
import { useNavigate } from 'react-router-dom';
import './unauthorized.css'

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <div className="icon-wrapper">
          <div className="padlock">
            <div className="padlock-shackle"></div>
            <div className="padlock-body"></div>
            <div className="padlock-keyhole"></div>
          </div>
        </div>
        <div className="error-code">403</div>
        <h1 className="error-title">Access Denied</h1>
        <p className="error-message">
          You don't have permission to access this page. 
          Please verify your credentials or contact your administrator.
        </p>
        <div className="error-actions">
          <button className="error-button primary" onClick={() => navigate('/login')}>
            Return to Login
          </button>
          <button className="error-button secondary" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
        <p className="error-help">
          Need assistance? <a href="/support">Contact Support</a>
        </p>
      </div>
    </div>
  );
};

export default Unauthorized;