// ContactFees.tsx — superadmin connection fee config (single record)
import { useEffect, useState } from 'react'
import {
  FiPhoneCall,
  FiSave,
  FiAlertCircle,
  FiRefreshCw,
} from 'react-icons/fi'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '../../../store/authtokenstore'
import Spinner from '../../../components/Publicspinner/Spinner'
import './contactfees.css'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

interface PlatformConfig {
  id: number
  connection_fee: string
  currency: string
  created_at: string
  updated_at: string
}

/* ────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────── */

const KES = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
})

/* ────────────────────────────────────────────────────────
   API
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

async function createConnectionFee(
  access: string | null,
  connection_fee: string
): Promise<PlatformConfig> {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/connection_fee/connection-fee/create/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ connection_fee }),
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(
      (data && data.message) || 'Failed to create connection fee'
    )
  }
  return data.data as PlatformConfig
}

async function updateConnectionFee(
  access: string | null,
  connection_fee: string
): Promise<PlatformConfig> {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/connection_fee/connection-fee/update/`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ connection_fee }),
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(
      (data && data.message) || 'Failed to update connection fee'
    )
  }
  return data.data as PlatformConfig
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

const ContactFees = () => {
  const { access } = useAuthStore()
  const queryClient = useQueryClient()

  const [amount, setAmount] = useState<string>('')
  const [touched, setTouched] = useState(false)

  /* ── Query ────────────────────────────────────────── */
  const {
    data: config,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['platform-config', access],
    queryFn: () => fetchConnectionFee(access),
    enabled: !!access,
    staleTime: 30_000,
    retry: 1,
  })

  const exists = !!config

  /* ── Seed input from fetched value ────────────────── */
  useEffect(() => {
    if (config && !touched) {
      setAmount(String(Number(config.connection_fee)))
    }
  }, [config, touched])

  /* ── Save mutation — decides create vs update ─────── */
  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      return exists
        ? updateConnectionFee(access, value)
        : createConnectionFee(access, value)
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['platform-config', access], saved)
      queryClient.invalidateQueries({
        queryKey: ['platform-config'],
      })

      toast.success(
        exists
          ? 'Connection fee updated.'
          : 'Connection fee created.',
        {
          duration: 2800,
          icon: '✅',
          style: {
            background: '#0a0a0a',
            border: '1px solid #22c55e',
            color: '#ffffff',
          },
        }
      )

      setTouched(false)
      setAmount(String(Number(saved.connection_fee)))
    },
    onError: (err: Error) => {
      toast.error(
        exists
          ? 'Failed to update connection fee'
          : 'Failed to create connection fee',
        {
          description: err.message,
          duration: 4500,
          icon: '⚠️',
          style: {
            background: '#0a0a0a',
            border: '1px solid #ef4444',
            color: '#ffffff',
          },
        }
      )
    },
  })

  /* ── Submit ───────────────────────────────────────── */
  const handleSave = () => {
    const trimmed = amount.trim()

    if (!trimmed) {
      toast.error('Please enter an amount.')
      return
    }

    const num = Number(trimmed)
    if (!Number.isFinite(num) || num < 0) {
      toast.error('Amount must be a non-negative number.')
      return
    }

    saveMutation.mutate(trimmed)
  }

  const isSaving = saveMutation.isPending

  /* ══════════════════════════════════════════════════════
     LOADER
     ══════════════════════════════════════════════════════ */
  if (isLoading) {
    return (
      <div className="cf-loader-screen">
        <Spinner
          message="Loading connection fee"
          slowMessage="Just a moment…"
          slowAfter={4000}
        />
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════
     ERROR
     ══════════════════════════════════════════════════════ */
  if (isError && error instanceof Error) {
    return (
      <div className="cf-error">
        <div className="cf-error-icon">⚠️</div>
        <h3 className="cf-error-title">
          Couldn't load the connection fee
        </h3>
        <p className="cf-error-text">{error.message}</p>
        <button
          type="button"
          className="cf-btn cf-btn-secondary"
          onClick={() => refetch()}
        >
          Try again
        </button>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════
     MAIN
     ══════════════════════════════════════════════════════ */
  const previewNumber = Number(amount) || 0

  return (
    <div className="cf-root">
      <div className="cf-card">
        <div className="cf-card-head">
          <div className="cf-card-icon">
            <FiPhoneCall />
          </div>

          <div className="cf-card-head-text">
            <h4 className="cf-card-title">
              Phone Reveal Fee
            </h4>
            <p className="cf-card-sub">
              {exists
                ? `Last updated ${new Date(
                    config!.updated_at
                  ).toLocaleDateString()}`
                : 'Not configured yet — save to activate.'}
            </p>
          </div>

          {exists && (
            <button
              type="button"
              className="cf-icon-btn"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh"
            >
              <FiRefreshCw
                className={isFetching ? 'cf-icon-spin' : ''}
              />
            </button>
          )}
        </div>

        <div className="cf-input-wrap">
          <span className="cf-input-prefix">KES</span>
          <input
            type="number"
            className="cf-input"
            min={0}
            step="1"
            placeholder="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setTouched(true)
            }}
            disabled={isSaving}
          />
          <span className="cf-input-suffix">per reveal</span>
        </div>

        <div className="cf-preview">
          <FiAlertCircle className="cf-preview-icon" />
          <span>
            Each unlock deducts{' '}
            <strong>{KES.format(previewNumber)}</strong> from the
            provider's wallet.
          </span>
        </div>

        <div className="cf-actions">
          <button
            type="button"
            className="cf-btn cf-btn-primary"
            onClick={handleSave}
            disabled={isSaving || !amount.trim()}
          >
            {isSaving ? (
              <>
                <span className="cf-spinner-small" />
                {exists ? 'Saving…' : 'Creating…'}
              </>
            ) : (
              <>
                <FiSave className="cf-btn-icon" />
                {exists ? 'Save Changes' : 'Create Fee'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ContactFees