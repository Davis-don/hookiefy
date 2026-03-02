import React, { useEffect } from 'react';
import './confirmationmodal.css'

interface ToastConfirmationProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  autoClose?: boolean;
  autoCloseTime?: number;
}

const ToastConfirmation: React.FC<ToastConfirmationProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel,
  autoClose = false,
  autoCloseTime = 5000
}) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onCancel();
      }, autoCloseTime);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseTime, onCancel]);

  if (!isOpen) return null;

  return (
    <div className={`toast-confirmation-overlay toast-confirmation-${type}`}>
      <div className={`toast-confirmation-container toast-confirmation-${type}`}>
        <div className="toast-confirmation-header">
          <div className="toast-confirmation-icon">
            {type === 'danger' && '⚠️'}
            {type === 'warning' && '⚡'}
            {type === 'info' && 'ℹ️'}
          </div>
          <h4 className="toast-confirmation-title">{title}</h4>
          <button className="toast-confirmation-close" onClick={onCancel}>✕</button>
        </div>
        
        <div className="toast-confirmation-body">
          <p className="toast-confirmation-message">{message}</p>
        </div>
        
        <div className="toast-confirmation-footer">
          <button 
            className="toast-confirmation-btn toast-confirmation-btn-cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className={`toast-confirmation-btn toast-confirmation-btn-confirm toast-confirmation-btn-${type}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToastConfirmation;