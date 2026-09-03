// Withdraw.tsx - Updated with phone number removed (handled by backend)
import './withdraw.css'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore'
import { toast } from 'sonner'
import {
  FiLoader,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiCheck,
  FiAlertCircle,
  FiRefreshCw,
  FiDollarSign,
  FiInfo,
  FiUser,
} from 'react-icons/fi'

// ============================================================
// TYPES
// ============================================================

interface BalanceData {
  message: string
  has_balance: boolean
  data?: {
    balance: string
    pending_balance: string
    total_earned: string
    total_withdrawn: string
    currency: string
    created_at: string
    updated_at: string
  }
}

interface WithdrawalRequest {
  amount: number
  // phone_number removed - will be handled by backend
}

interface WithdrawalResponse {
  success: boolean
  message: string
  withdrawal: {
    id: number
    reference: string
    amount: number
    phone_number: string
    status: string
    created_at: string
  }
  new_balance: number
  transfer_code: string
}

interface WithdrawalHistoryItem {
  id: number
  amount: number
  currency: string
  phone_number: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  reference: string
  created_at: string
  completed_at: string | null
}

interface WithdrawalHistoryResponse {
  success: boolean
  count: number
  withdrawals: WithdrawalHistoryItem[]
}

// ============================================================
// API HELPERS
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hookiefy-server-7d6d.onrender.com'

const fetchBalance = async (token: string | null): Promise<BalanceData> => {
  if (!token) {
    throw new Error('No access token found. Please login again.')
  }

  const response = await fetch(`${API_BASE_URL}/balance/current-balance/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      return {
        message: 'Balance not found',
        has_balance: false,
      }
    }
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to fetch balance')
  }

  return response.json()
}

const fetchWithdrawalHistory = async (token: string | null): Promise<WithdrawalHistoryResponse> => {
  if (!token) {
    throw new Error('No access token found. Please login again.')
  }

  const response = await fetch(`${API_BASE_URL}/withdrawals/withdrawals/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to fetch withdrawal history')
  }

  return response.json()
}

const initiateWithdrawal = async (
  data: WithdrawalRequest,
  token: string | null
): Promise<WithdrawalResponse> => {
  if (!token) {
    throw new Error('No access token found. Please login again.')
  }

  const response = await fetch(`${API_BASE_URL}/withdrawals/withdraw/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || errorData.message || 'Withdrawal failed')
  }

  return response.json()
}

// ============================================================
// COMPONENT
// ============================================================

function Withdraw() {
  const { access: accessToken } = useAuthStore()
  const queryClient = useQueryClient()

  const [amount, setAmount] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const quickAmounts = [100, 500, 1000, 2000, 5000]

  // ---- Queries ----
  const {
    data: balanceData,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ['adminBalance', accessToken],
    queryFn: () => fetchBalance(accessToken),
    enabled: !!accessToken,
    staleTime: 30000,
    gcTime: 60000,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    retry: 1,
  })

  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['withdrawals', accessToken],
    queryFn: () => fetchWithdrawalHistory(accessToken),
    enabled: !!accessToken,
    staleTime: 60000,
    gcTime: 120000,
    refetchOnWindowFocus: true,
    retry: 1,
  })

  // ---- Mutation ----
  const mutation = useMutation({
    mutationFn: (data: WithdrawalRequest) => initiateWithdrawal(data, accessToken),
    onSuccess: (data) => {
      toast.success('Withdrawal initiated successfully!', {
        description: `KES ${data.withdrawal.amount.toLocaleString()} sent to ${data.withdrawal.phone_number}`,
        duration: 5000,
        icon: '📱',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })

      setSuccess(`✅ Withdrawal of KES ${data.withdrawal.amount.toLocaleString()} initiated successfully!`)
      setAmount('')
      setError('')

      queryClient.invalidateQueries({ queryKey: ['adminBalance'] })
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] })
    },
    onError: (error: Error) => {
      toast.error('Withdrawal failed', {
        description: error.message || 'Please try again or contact support.',
        duration: 5000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })

      setError(error.message || 'Something went wrong. Please try again.')
      setSuccess('')
    },
  })

  // ---- Handlers ----
  const handleWithdraw = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const withdrawAmount = parseFloat(amount)

    // Validation
    if (!amount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setError('Please enter a valid amount')
      toast.error('Invalid amount', {
        description: 'Please enter a valid withdrawal amount.',
        duration: 3000,
        icon: '⚠️',
      })
      return
    }

    // Get current balance from the balance data
    const currentBalance = balanceData?.has_balance && balanceData?.data 
      ? parseFloat(balanceData.data.balance) 
      : 0

    if (withdrawAmount > currentBalance) {
      const msg = `Insufficient balance. Available: KES ${currentBalance.toLocaleString()}`
      setError(msg)
      toast.error('Insufficient balance', {
        description: msg,
        duration: 4000,
        icon: '⚠️',
      })
      return
    }

    // Phone number is handled by the backend using the user's stored phone number
    // No need for frontend validation

    mutation.mutate({
      amount: withdrawAmount,
    })
  }

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString())
    setError('')
    setSuccess('')
  }

  const handleRefresh = () => {
    refetchBalance()
    refetchHistory()
    toast.info('Refreshing...', {
      description: 'Fetching latest balance and withdrawal history.',
      duration: 2000,
      icon: '🔄',
    })
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
      pending: {
        icon: <FiClock />,
        label: 'Pending',
        className: 'pending',
      },
      processing: {
        icon: <FiRefreshCw />,
        label: 'Processing',
        className: 'processing',
      },
      completed: {
        icon: <FiCheck />,
        label: 'Completed',
        className: 'completed',
      },
      failed: {
        icon: <FiAlertCircle />,
        label: 'Failed',
        className: 'failed',
      },
      cancelled: {
        icon: <FiXCircle />,
        label: 'Cancelled',
        className: 'cancelled',
      },
    }
    return badges[status] || { icon: <FiInfo />, label: status, className: '' }
  }

  const hasBalance = balanceData?.has_balance && balanceData?.data
  const balance = hasBalance ? parseFloat(balanceData.data!.balance) : 0
  const currency = hasBalance ? balanceData.data!.currency : 'KES'
  const withdrawals = historyData?.withdrawals || []

  return (
    <div className="withdraw-container">
      {/* Refresh Button */}
      <button
        type="button"
        className="withdraw-refresh-btn"
        onClick={handleRefresh}
        disabled={balanceLoading || historyLoading || mutation.isPending}
        aria-label="Refresh balance and history"
      >
        <FiRefreshCw className={balanceLoading || historyLoading ? 'spinning' : ''} />
      </button>

      {/* M-Pesa Available Balance Card */}
      <div className="mpesa-available-card">
        <div className="mpesa-header">
          <span className="mpesa-icon">📱</span>
          <span className="mpesa-label">Available Balance</span>
        </div>
        <div className="mpesa-balance">
          <span className="mpesa-currency">{currency}</span>
          <span className="mpesa-amount">
            {balanceLoading ? (
              <span className="loading-shimmer">Loading...</span>
            ) : (
              balance.toLocaleString('en-KE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            )}
          </span>
        </div>
        <div className="mpesa-footer">
          <span className="mpesa-status">● Active</span>
          <span className="mpesa-update">
            {balanceLoading ? 'Loading...' : 'Updated just now'}
          </span>
        </div>
      </div>

      {/* Withdrawal Form */}
      <form className="withdraw-form" onSubmit={handleWithdraw}>
        <div className="form-group">
          <label htmlFor="amount">
            <FiDollarSign className="label-icon" />
            Amount ({currency}) <span className="required">*</span>
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setError('')
              setSuccess('')
            }}
            min="0.01"
            max={balance}
            step="0.01"
            required
            disabled={mutation.isPending}
            className={error && !amount ? 'input-error' : ''}
          />
          <small className="input-hint">
            <FiUser className="hint-icon" />
            Funds will be sent to your registered M-Pesa number
          </small>
        </div>

        {/* Quick Amount Buttons */}
        <div className="quick-amounts">
          {quickAmounts.map((value) => (
            <button
              key={value}
              type="button"
              className="quick-amount-btn"
              onClick={() => handleQuickAmount(value)}
              disabled={mutation.isPending}
            >
              KES {value.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="message error">
            <span className="message-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="message success">
            <span className="message-icon">✅</span>
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          className="withdraw-submit-btn"
          disabled={mutation.isPending || balanceLoading}
        >
          {mutation.isPending ? (
            <>
              <FiLoader className="spinning" />
              Processing...
            </>
          ) : (
            <>
              <FiCheckCircle />
              Withdraw to M-Pesa
            </>
          )}
        </button>

        {/* Footer Info */}
        <div className="withdraw-footer">
          <p className="footer-main">💳 Withdraw to M-Pesa</p>
          <p className="footer-limits">Maximum: KES 150,000 per day</p>
          <p className="footer-fee">Transaction fee: 0% (Free)</p>
        </div>
      </form>

      {/* Withdrawal History */}
      {!historyLoading && withdrawals.length > 0 && (
        <div className="withdrawal-history">
          <div className="history-header">
            <h3>
              <FiClock className="history-icon" />
              Recent Withdrawals
            </h3>
            <span className="history-count">{withdrawals.length} total</span>
          </div>
          <div className="history-list">
            {withdrawals.slice(0, 5).map((withdrawal) => {
              const status = getStatusBadge(withdrawal.status)
              return (
                <div key={withdrawal.id} className="history-item">
                  <div className="history-info">
                    <span className="history-amount">
                      KES {withdrawal.amount.toLocaleString()}
                    </span>
                    <span className="history-phone">
                      <FiUser className="history-phone-icon" />
                      {withdrawal.phone_number}
                    </span>
                  </div>
                  <div className="history-status">
                    <span className={`status-badge ${status.className}`}>
                      {status.icon}
                      {status.label}
                    </span>
                    <span className="history-date">
                      {new Date(withdrawal.created_at).toLocaleDateString('en-KE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {withdrawal.reference && (
                      <span className="history-ref">
                        Ref: {withdrawal.reference.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Loading state for history */}
      {historyLoading && (
        <div className="withdrawal-history loading">
          <div className="history-loading">
            <FiLoader className="spinning" />
            <span>Loading withdrawal history...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Withdraw