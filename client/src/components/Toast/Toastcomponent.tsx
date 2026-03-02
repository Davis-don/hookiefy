import { useEffect, useState } from 'react';
import { useToastStore } from '../../store/Toaststore';
import type { Toast } from '../../store/Toaststore';
import './toastcomponent.css';

const Toastcomponent = () => {
  const { currentToast, removeToast } = useToastStore();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (currentToast) {
      setIsExiting(false);
    }
  }, [currentToast]);

  const handleClose = () => {
    if (!currentToast) return;
    
    setIsExiting(true);
    setTimeout(() => {
      removeToast();
      setIsExiting(false);
    }, 500); // Slightly longer exit animation for larger toast
  };

  const getToastIcon = (type: Toast['type'], customIcon?: string) => {
    if (customIcon) return customIcon;
    
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'romantic': return '💝';
      default: return '💫';
    }
  };

  const getToastTitle = (type: Toast['type'], customTitle?: string) => {
    if (customTitle) return customTitle;
    
    switch (type) {
      case 'success': return 'Success!';
      case 'error': return 'Error!';
      case 'info': return 'Info';
      case 'warning': return 'Warning!';
      case 'romantic': return 'Love is in the air';
      default: return 'Hookify';
    }
  };

  if (!currentToast) return null;

  return (
    <div className="toast-global-overlay">
      <div
        className={`toast-slide-container ${isExiting ? 'toast-slide-exit' : 'toast-slide-enter'}`}
        onClick={handleClose}
      >
        <div className={`toast-alert toast-${currentToast.type}`}>
          {/* Progress Bar - Now thicker and more prominent */}
          {currentToast.duration && currentToast.duration > 0 && (
            <div className="toast-progress-container">
              <div 
                className="toast-progress-bar"
                style={{
                  animation: `shrinkProgress ${currentToast.duration}ms linear forwards`
                }}
              />
            </div>
          )}

          <div className="toast-alert-content">
            {/* Icon - Much larger */}
            <span className="toast-alert-icon">
              {getToastIcon(currentToast.type, currentToast.icon)}
            </span>

            {/* Text Content - Larger with more spacing */}
            <div className="toast-alert-text">
              <h3 className="toast-alert-title">
                {getToastTitle(currentToast.type, currentToast.title)}
              </h3>
              <p className="toast-alert-message">{currentToast.message}</p>
            </div>

            {/* Close Button - Larger */}
            <button 
              className="toast-alert-close"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              aria-label="Close"
            >
              <span>✕</span>
            </button>
          </div>

          {/* Decorative Elements - More prominent */}
          <div className="toast-alert-decoration">
            <span className="decoration-heart">❤️</span>
            <span className="decoration-rose">🌹</span>
            <span className="decoration-star">✨</span>
            <span className="decoration-heart-2">💕</span>
            <span className="decoration-star-2">⭐</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toastcomponent;