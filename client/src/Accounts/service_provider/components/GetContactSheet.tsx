// GetContactSheet.tsx — bottom sheet for revealing a provider's contact
import { useEffect, useState } from 'react'
import {
  FiX,
  FiPhone,
  FiMessageCircle,
  FiUser,
  FiPackage,
  FiHeart,
  FiTool,
  FiStar,
  FiShield,
} from 'react-icons/fi'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '../../../store/authtokenstore'
import './getcontactsheet.css'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

type ListingType = 'service' | 'product' | 'hookup'

export interface GetContactSheetService {
  id: number
  title: string
  listing_type: ListingType
  price?: string
  pricing_unit?: string
  primary_image_url?: string | null
  is_featured?: boolean
  provider?: {
    id: number
    first_name: string
    last_name: string
    full_name: string
    profile_image_url: string | null
  } | null
  category?: {
    id: number
    name: string
  } | null
}

interface PlatformConfig {
  id: number
  connection_fee: string
  currency: string
  created_at: string
  updated_at: string
}

interface InitiatePaymentResponse {
  success: boolean
  message: string
  redirect_url?: string
  payment?: {
    id: number
    merchant_reference: string
    amount: string
    status: string
    order_tracking_id: string
  }
}

interface GetContactSheetProps {
  open: boolean
  service: GetContactSheetService | null
  /** Called when the user confirms the reveal (before payment, still useful for analytics) */
  onConfirm?: (service: GetContactSheetService) => void
  /** Called when the sheet is dismissed */
  onClose: () => void
  /** Optional override — if not provided, the sheet fetches it */
  feeAmount?: number
}

/* ────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────── */

const KES = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
})

const PRICING_UNITS: Record<string, string> = {
  per_hour: 'Per Hour',
  per_day: 'Per Day',
  per_week: 'Per Week',
  per_month: 'Per Month',
  per_job: 'Per Job',
  per_item: 'Per Item',
}

function initials(first?: string, last?: string) {
  const f = (first || '?').charAt(0).toUpperCase()
  const l = (last || '?').charAt(0).toUpperCase()
  return `${f}${l}`
}

function formatPrice(price?: string, unit?: string) {
  if (!price) return null
  const num = Number(price)
  if (!Number.isFinite(num) || num === 0) return null
  const label = unit ? PRICING_UNITS[unit] ?? unit : ''
  return label
    ? `KES ${num.toLocaleString()} · ${label}`
    : `KES ${num.toLocaleString()}`
}

/* ────────────────────────────────────────────────────────
   API — fetch fee
   ──────────────────────────────────────────────────────── */

async function fetchConnectionFee(
  access: string | null
): Promise<PlatformConfig | null> {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/connection_fee/connection-fee/`,
    {
      headers: {
        Authorization: `Bearer ${access}`,
        Accept: 'application/json',
      },
    }
  )

  if (res.status === 404) return null

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(
      (data && data.message) || 'Failed to load connection fee'
    )
  }
  return (data?.data ?? null) as PlatformConfig | null
}

/* ────────────────────────────────────────────────────────
   API — initiate payment
   ──────────────────────────────────────────────────────── */

async function initiateServicePayment(
  access: string | null,
  serviceId: number,
  phoneNumber: string
): Promise<InitiatePaymentResponse> {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/payments/service/initiate/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        service_id: serviceId,
        phone_number: phoneNumber,
      }),
    }
  )

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(
      (data && (data.message || data.detail)) ||
        'Payment initiation failed'
    )
  }

  return data as InitiatePaymentResponse
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

function GetContactSheet({
  open,
  service,
  onConfirm,
  onClose,
  feeAmount,
}: GetContactSheetProps) {
  const { access } = useAuthStore()

  /* Local phone entry — user types it before unlocking */
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)

  /* Fetch the fee */
  const {
    data: config,
    isLoading: feeLoading,
    isError: feeError,
  } = useQuery({
    queryKey: ['platform-config', access],
    queryFn: () => fetchConnectionFee(access),
    enabled: !!access && open,
    staleTime: 60_000,
    retry: 1,
  })

  const resolvedFee =
    feeAmount !== undefined
      ? feeAmount
      : config
      ? Number(config.connection_fee)
      : undefined

  const feeIsZero = resolvedFee !== undefined && resolvedFee === 0

  /* Initiate-payment mutation */
  const payMutation = useMutation({
    mutationFn: (args: { serviceId: number; phone: string }) =>
      initiateServicePayment(access, args.serviceId, args.phone),
    onSuccess: (data) => {
      /* Notify the parent (analytics / logging) */
      if (service) onConfirm?.(service)

      /* Redirect to Pesapal if a URL came back */
      if (data.redirect_url) {
        window.location.href = data.redirect_url
        return
      }

      toast.success('Payment started.', {
        duration: 2500,
        style: {
          background: '#0a0a0a',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })

      onClose()
    },
    onError: (err: Error) => {
      toast.error('Payment failed to start', {
        description: err.message,
        duration: 4500,
        style: {
          background: '#0a0a0a',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
    },
  })

  /* Escape closes */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !payMutation.isPending) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, payMutation.isPending, onClose])

  /* Lock scroll while open */
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !service) return null

  const isHookup = service.listing_type === 'hookup'
  const priceLabel = formatPrice(service.price, service.pricing_unit)
  const providerName =
    service.provider?.full_name ||
    (service.provider
      ? `${service.provider.first_name} ${service.provider.last_name}`.trim()
      : 'Provider')

  const isProcessing = payMutation.isPending

  /* ── Validate + fire ───────────────────────────────── */
  const handlePay = () => {
    if (isProcessing || feeLoading) return

    const cleaned = phone.replace(/[\s-]/g, '')
    if (!/^\+?\d{9,15}$/.test(cleaned)) {
      setPhoneError('Enter a valid phone number.')
      return
    }
    setPhoneError(null)

    payMutation.mutate({
      serviceId: service.id,
      phone: cleaned,
    })
  }

  /* ── Fee row — loading / error / resolved / free ──── */
  const renderFeeRow = () => {
    if (feeAmount !== undefined) {
      return (
        <div className="gcs-fee-row">
          <span className="gcs-fee-label">Access fee</span>
          <span className="gcs-fee-value">
            {KES.format(feeAmount)}
          </span>
        </div>
      )
    }

    if (feeLoading) {
      return (
        <div className="gcs-fee-row">
          <span className="gcs-fee-label">Access fee</span>
          <span className="gcs-fee-value gcs-fee-value-skeleton">
            <span className="gcs-skeleton" />
          </span>
        </div>
      )
    }

    if (feeError) {
      return (
        <div className="gcs-fee-row">
          <span className="gcs-fee-label">Access fee</span>
          <span className="gcs-fee-value gcs-fee-value-error">
            Unavailable
          </span>
        </div>
      )
    }

    if (resolvedFee === undefined) {
      return (
        <div className="gcs-fee-row">
          <span className="gcs-fee-label">Access fee</span>
          <span className="gcs-fee-value gcs-fee-value-error">
            Not set
          </span>
        </div>
      )
    }

    if (feeIsZero) {
      return (
        <div className="gcs-fee-row">
          <span className="gcs-fee-label">Access fee</span>
          <span className="gcs-fee-value gcs-fee-value-free">
            Free
          </span>
        </div>
      )
    }

    return (
      <div className="gcs-fee-row">
        <span className="gcs-fee-label">Access fee</span>
        <span className="gcs-fee-value">
          {KES.format(resolvedFee)}
        </span>
      </div>
    )
  }

  return (
    <div
      className="gcs-overlay"
      onClick={(e) => {
        e.stopPropagation()
        if (!isProcessing) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gcs-title"
    >
      <div
        className={`gcs-sheet ${open ? 'gcs-sheet-open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gcs-handle" aria-hidden="true" />

        <button
          type="button"
          className="gcs-close"
          onClick={onClose}
          disabled={isProcessing}
          aria-label="Close"
        >
          <FiX />
        </button>

        {/* Header */}
        <div className="gcs-header">
          <h2 id="gcs-title" className="gcs-title">
            Get Contact
          </h2>
          <p className="gcs-subtitle">
            {isHookup
              ? 'Unlock to see their contact details.'
              : "Unlock the provider's contact details."}
          </p>
        </div>

        {/* Service preview */}
        <div className="gcs-preview">
          {service.primary_image_url ? (
            <img
              src={service.primary_image_url}
              alt={service.title}
              className="gcs-preview-img"
              loading="lazy"
            />
          ) : (
            <div className="gcs-preview-img gcs-preview-img-fallback">
              {isHookup ? <FiHeart /> : <FiPackage />}
            </div>
          )}

          <div className="gcs-preview-body">
            <div className="gcs-preview-tags">
              <span
                className={`gcs-type gcs-type-${service.listing_type}`}
              >
                {service.listing_type === 'service' && (
                  <>
                    <FiTool /> Service
                  </>
                )}
                {service.listing_type === 'product' && (
                  <>
                    <FiPackage /> Product
                  </>
                )}
                {service.listing_type === 'hookup' && (
                  <>
                    <FiHeart /> Hookup
                  </>
                )}
              </span>

              {service.is_featured && (
                <span className="gcs-type gcs-type-featured">
                  <FiStar /> Featured
                </span>
              )}
            </div>

            <h3 className="gcs-preview-title">
              {service.title || 'Untitled listing'}
            </h3>

            {service.provider && (
              <div className="gcs-provider">
                {service.provider.profile_image_url ? (
                  <img
                    src={service.provider.profile_image_url}
                    alt={providerName}
                    className="gcs-provider-avatar"
                  />
                ) : (
                  <div className="gcs-provider-avatar gcs-provider-avatar-fallback">
                    {initials(
                      service.provider.first_name,
                      service.provider.last_name
                    )}
                  </div>
                )}
                <span className="gcs-provider-name">
                  {providerName}
                </span>
              </div>
            )}

            {!isHookup && priceLabel && (
              <div className="gcs-price">{priceLabel}</div>
            )}
          </div>
        </div>

        {/* Benefits */}
        <ul className="gcs-benefits">
          <li className="gcs-benefit">
            <span className="gcs-benefit-icon">
              <FiPhone />
            </span>
            <div>
              <span className="gcs-benefit-title">
                Phone number
              </span>
              <span className="gcs-benefit-sub">
                Direct line to reach them
              </span>
            </div>
          </li>

          <li className="gcs-benefit">
            <span className="gcs-benefit-icon">
              <FiMessageCircle />
            </span>
            <div>
              <span className="gcs-benefit-title">
                Direct chat
              </span>
              <span className="gcs-benefit-sub">
                Message them on Youpata
              </span>
            </div>
          </li>

          <li className="gcs-benefit">
            <span className="gcs-benefit-icon">
              <FiUser />
            </span>
            <div>
              <span className="gcs-benefit-title">
                Full profile
              </span>
              <span className="gcs-benefit-sub">
                View their verified details
              </span>
            </div>
          </li>
        </ul>

        {/* Phone entry — Pesapal needs a phone number */}
        <div className="gcs-phone-wrap">
          <label className="gcs-phone-label" htmlFor="gcs-phone">
            M-Pesa phone number
          </label>
          <input
            id="gcs-phone"
            type="tel"
            className={`gcs-phone-input ${
              phoneError ? 'gcs-phone-input-error' : ''
            }`}
            placeholder="07XX XXX XXX"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              if (phoneError) setPhoneError(null)
            }}
            disabled={isProcessing}
            inputMode="tel"
            autoComplete="tel"
          />
          {phoneError && (
            <span className="gcs-phone-error">{phoneError}</span>
          )}
          <span className="gcs-phone-hint">
            You'll receive an M-Pesa prompt to complete payment.
          </span>
        </div>

        {/* Fee + action */}
        <div className="gcs-footer">
          {renderFeeRow()}

          <button
            type="button"
            className="gcs-cta"
            onClick={handlePay}
            disabled={
              isProcessing ||
              feeLoading ||
              resolvedFee === undefined
            }
          >
            {isProcessing ? (
              <>
                <span className="gcs-spinner" />
                Redirecting…
              </>
            ) : (
              <>
                <FiShield />
                {feeIsZero ? 'Reveal Contact' : 'Pay & Unlock'}
              </>
            )}
          </button>

          <p className="gcs-note">
            {feeIsZero
              ? 'No fee is charged for this reveal.'
              : 'The fee is charged to your M-Pesa number. By continuing you agree to our'}{' '}
            <a href="/terms" className="gcs-note-link">
              terms
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

export default GetContactSheet