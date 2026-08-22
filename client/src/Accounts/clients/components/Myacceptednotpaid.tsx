import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from '../../../store/Toaststore'
import Spinner from '../../../components/protected/protectedspinner/Spinner'
import './myacceptednotpaid.css'

interface HookupDetailData {
  id: number
  sender: number
  receiver: number
  sender_name: string
  receiver_name: string
  message: string | null
  location: string | null
  scheduled_time: string | null
  status: string
  is_paid: boolean
  is_read_by_sender: boolean
  is_read_by_receiver: boolean
  created_at: string
  sender_profile_img?: string | null
  receiver_profile_img?: string | null
}

interface MyacceptednotpaidProps {
  hookup: HookupDetailData
  onHookupDeleted: () => void
  onBack: () => void
}

interface ApiError {
  error?: string
  detail?: string
  message?: string
}

function Myacceptednotpaid({ hookup, onHookupDeleted, onBack }: MyacceptednotpaidProps) {
  const apiUrl = import.meta.env.VITE_API_URL
  const queryClient = useQueryClient()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card')
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Dummy payment amount - you can replace with actual amount from backend
  const paymentAmount = 50.00

  // Cancel hookup mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${apiUrl}/hookup/hookup/${hookup.id}/cancel/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw data
      }

      return data
    },
    onMutate: () => {
      toast.info('Cancelling your request...', { duration: 2000 })
    },
    onSuccess: (data) => {
      setShowCancelModal(false)
      queryClient.invalidateQueries({ queryKey: ['my-sent-hookups'] })
      queryClient.invalidateQueries({ queryKey: ['hookup-detail', hookup.id] })
      
      toast.success(data.message || 'Request cancelled successfully', {
        duration: 4000,
      })
      
      onHookupDeleted()
      onBack()
    },
    onError: (error: ApiError) => {
      const errorMessage = error.message || error.detail || error.error || 'Failed to cancel request'
      toast.error(errorMessage, { duration: 5000 })
    },
  })

  // Dummy payment handler
  const handlePayment = () => {
    setShowPaymentModal(true)
  }

  const handleProcessPayment = () => {
    // This will be replaced with actual payment gateway integration
    toast.info('Processing payment...', { duration: 2000 })
    
    setTimeout(() => {
      toast.success('Payment successful! (Demo)', { duration: 3000 })
      setShowPaymentModal(false)
      
      // For demo purposes, you can call a dummy success callback
      // In production, this would redirect to payment gateway or handle webhook
    }, 2000)
  }

  const handleCancelClick = () => {
    setShowCancelModal(true)
  }

  const handleConfirmCancel = () => {
    cancelMutation.mutate()
  }

  const handleCloseModals = () => {
    setShowCancelModal(false)
    setShowPaymentModal(false)
  }

  return (
    <>
      <div className="myacceptednotpaid-container">
        <div className="myacceptednotpaid-content">
          <div className="icon-wrapper">
            <div className="main-icon">✅</div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
            <div className="pulse-ring delay-2"></div>
          </div>
          
          <h1 className="title">Request Accepted! 🎉</h1>
          
          <p className="message">
            Great news! <strong>{hookup.receiver_name}</strong> has accepted your hookup request!
          </p>
          
          <div className="status-indicator success">
            <div className="status-dot success-dot"></div>
            <span className="status-text">Accepted - Awaiting Payment</span>
          </div>
          
          <div className="payment-banner">
            <div className="payment-icon">💰</div>
            <div className="payment-text">
              <strong>Payment Required</strong>
              <span>Please complete payment to proceed</span>
            </div>
          </div>
          
          <div className="amount-card">
            <div className="amount-label">Total Amount</div>
            <div className="amount-value">${paymentAmount.toFixed(2)}</div>
            <div className="amount-note">Includes service fee & taxes</div>
          </div>
          
          <div className="request-details-card">
            {hookup.message && (
              <div className="detail-row">
                <span className="detail-label">💬 Your Message:</span>
                <p className="detail-value">{hookup.message}</p>
              </div>
            )}

            {hookup.location && (
              <div className="detail-row">
                <span className="detail-label">📍 Location:</span>
                <p className="detail-value">{hookup.location}</p>
              </div>
            )}

            {hookup.scheduled_time && (
              <div className="detail-row">
                <span className="detail-label">🕒 Scheduled Time:</span>
                <p className="detail-value">
                  {new Date(hookup.scheduled_time).toLocaleString()}
                </p>
              </div>
            )}
          </div>
          
          <p className="note">
            💡 Payment is required to complete the booking. Once payment is confirmed, 
            you can proceed with the hookup.
          </p>
          
          <div className="action-buttons">
            <button 
              className="payment-btn"
              onClick={handlePayment}
            >
              💳 Make Payment
            </button>
            
            <button 
              className="cancel-request-btn"
              onClick={handleCancelClick}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? <Spinner size="small" color="#666" /> : 'Cancel Request'}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="hn-modal-overlay" onClick={handleCloseModals}>
          <div className="hn-modal-container payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hn-modal-header">
              <div className="hn-modal-icon">💳</div>
              <h3 className="hn-modal-title">Complete Payment</h3>
              <button className="modal-close" onClick={handleCloseModals}>×</button>
            </div>
            
            <div className="hn-modal-body">
              <div className="payment-amount-display">
                <span>Amount to Pay:</span>
                <strong>${paymentAmount.toFixed(2)}</strong>
              </div>
              
              <div className="payment-methods">
                <label className="payment-method-label">Select Payment Method</label>
                
                <div className="payment-options">
                  <label className={`payment-option ${selectedPaymentMethod === 'card' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={selectedPaymentMethod === 'card'}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    />
                    <div className="payment-option-content">
                      <span className="payment-icon">💳</span>
                      <div>
                        <div className="payment-option-title">Credit / Debit Card</div>
                        <div className="payment-option-desc">Pay with Visa, Mastercard, Amex</div>
                      </div>
                    </div>
                  </label>
                  
                  <label className={`payment-option ${selectedPaymentMethod === 'mobile' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mobile"
                      checked={selectedPaymentMethod === 'mobile'}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    />
                    <div className="payment-option-content">
                      <span className="payment-icon">📱</span>
                      <div>
                        <div className="payment-option-title">Mobile Money</div>
                        <div className="payment-option-desc">M-Pesa, Airtel Money, etc.</div>
                      </div>
                    </div>
                  </label>
                  
                  <label className={`payment-option ${selectedPaymentMethod === 'paypal' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paypal"
                      checked={selectedPaymentMethod === 'paypal'}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    />
                    <div className="payment-option-content">
                      <span className="payment-icon">🅿️</span>
                      <div>
                        <div className="payment-option-title">PayPal</div>
                        <div className="payment-option-desc">Fast & Secure</div>
                      </div>
                    </div>
                  </label>
                </div>
                
                {selectedPaymentMethod === 'card' && (
                  <div className="card-details">
                    <input type="text" placeholder="Card Number" className="payment-input" />
                    <div className="card-row">
                      <input type="text" placeholder="MM/YY" className="payment-input half" />
                      <input type="text" placeholder="CVC" className="payment-input half" />
                    </div>
                    <input type="text" placeholder="Cardholder Name" className="payment-input" />
                  </div>
                )}
                
                {selectedPaymentMethod === 'mobile' && (
                  <div className="mobile-details">
                    <input type="tel" placeholder="Phone Number" className="payment-input" />
                    <select className="payment-input">
                      <option>Select Provider</option>
                      <option>M-Pesa</option>
                      <option>Airtel Money</option>
                      <option>Tigo Pesa</option>
                    </select>
                  </div>
                )}
                
                {selectedPaymentMethod === 'paypal' && (
                  <div className="paypal-details">
                    <p className="paypal-info">You will be redirected to PayPal to complete your payment securely.</p>
                  </div>
                )}
              </div>
              
              <div className="payment-security">
                <span className="security-icon">🔒</span>
                <span>Your payment is secure and encrypted</span>
              </div>
            </div>
            
            <div className="hn-modal-footer">
              <button 
                className="hn-modal-btn hn-modal-secondary"
                onClick={handleCloseModals}
              >
                Cancel
              </button>
              <button 
                className="hn-modal-btn hn-modal-success"
                onClick={handleProcessPayment}
              >
                Pay ${paymentAmount.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="hn-modal-overlay" onClick={handleCloseModals}>
          <div className="hn-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="hn-modal-header">
              <div className="hn-modal-icon">🚫</div>
              <h3 className="hn-modal-title">Cancel Request</h3>
            </div>
            <div className="hn-modal-body">
              <p>Are you sure you want to cancel this accepted request to <strong>{hookup.receiver_name}</strong>?</p>
              <p className="hn-modal-warning">⚠️ This action cannot be undone. The request will be permanently deleted.</p>
            </div>
            <div className="hn-modal-footer">
              <button 
                className="hn-modal-btn hn-modal-secondary"
                onClick={handleCloseModals}
                disabled={cancelMutation.isPending}
              >
                Keep Request
              </button>
              <button 
                className="hn-modal-btn hn-modal-danger"
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? <Spinner size="small" color="white" /> : 'Yes, Cancel Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Myacceptednotpaid