import React from 'react';
import './spinner.css'

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  message?: string;
  fullPage?: boolean;
}

const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'medium', 
  color = '#1a202c',
  message,
  fullPage = false 
}) => {
  const spinnerSize = {
    small: 24,
    medium: 40,
    large: 60
  };

  const strokeWidth = {
    small: 3,
    medium: 4,
    large: 5
  };

  const sizeValue = spinnerSize[size];
  const strokeValue = strokeWidth[size];

  const spinnerContent = (
    <div className={`spinner-wrapper ${size}`}>
      <div className="spinner-container">
        <svg
          className="spinner-svg"
          width={sizeValue}
          height={sizeValue}
          viewBox={`0 0 ${sizeValue} ${sizeValue}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background circle */}
          <circle
            className="spinner-background"
            cx={sizeValue / 2}
            cy={sizeValue / 2}
            r={(sizeValue - strokeValue) / 2}
            fill="none"
            stroke={color}
            strokeWidth={strokeValue}
            opacity="0.2"
          />
          
          {/* Animated circle */}
          <circle
            className="spinner-circle"
            cx={sizeValue / 2}
            cy={sizeValue / 2}
            r={(sizeValue - strokeValue) / 2}
            fill="none"
            stroke={color}
            strokeWidth={strokeValue}
            strokeLinecap="round"
            strokeDasharray={Math.PI * (sizeValue - strokeValue)}
            strokeDashoffset={Math.PI * (sizeValue - strokeValue) * 0.75}
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${sizeValue / 2} ${sizeValue / 2}`}
              to={`360 ${sizeValue / 2} ${sizeValue / 2}`}
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
        
        {/* Optional pulsing dot in center for larger spinners */}
        {size === 'large' && (
          <div className="spinner-center-dot" style={{ backgroundColor: color }} />
        )}
      </div>
      
      {message && <p className="spinner-text" style={{ color }}>{message}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="spinner-full-page">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default Spinner;