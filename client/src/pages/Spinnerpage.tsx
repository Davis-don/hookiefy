import React from 'react';
import Spinner from '../components/protected/protectedspinner/Spinner';
import './spinnerpage.css'

const CenteredSpinner: React.FC = () => {
  return (
    <div className="centered-spinner-container">
      <div className="centered-spinner-wrapper">
        <div className="centered-spinner-content">
          <Spinner size="large" color="#4f46e5" text="Loading..." />
        </div>
      </div>
    </div>
  );
};

export default CenteredSpinner;