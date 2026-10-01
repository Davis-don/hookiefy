// components/plans/PlanPurchaseSheet.tsx
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FiX,
  FiPhone,
  FiAlertCircle,
  FiLoader,
} from 'react-icons/fi';
import { useAuthStore } from '../../../../store/authtokenstore';
import type { Plan } from './PlanCard';
import './planpurchasesheet.css';

/* ─────────── API helpers ─────────── */

function resolveApiOrigin(): string {
  // @ts-ignore
  const envUrl: string | undefined = import.meta.env?.VITE_API_URL;
  if (!envUrl || !envUrl.trim()) return '';
  return envUrl.replace(/\/+$/, '');
}

const API_ORIGIN = resolveApiOrigin();

function readStoredToken(): string | null {
  const keys = ['access_token', 'accessToken', 'access', 'token', 'jwt'];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v && v.trim() && !v.startsWith('{')) return v;
  }
  return null;
}

function useAccessToken(): string | null {
  const store = useAuthStore() as unknown;
  return useMemo(() => {
    if (store && typeof store === 'object') {
      const s = store as Record<string, unknown>;
      for (const k of ['access', 'accessToken', 'access_token', 'token', 'jwt']) {
        if (typeof s[k] === 'string' && (s[k] as string).trim()) {
          return s[k] as string;
        }
      }
      const nested = (s.tokens || s.auth) as Record<string, unknown> | undefined;
      if (nested) {
        const inner =
          nested.access ||
          nested.accessToken ||
          nested.access_token ||
          nested.token;
        if (typeof inner === 'string' && inner.trim()) return inner;
      }
    }
    return readStoredToken();
  }, [store]);
}

/* ─────────── Types ─────────── */

type Phase = 'form' | 'redirecting' | 'failed';

interface InitiateResponse {
  message?: string;
  amount?: number | string;
  currency?: string;
  merchant_reference?: string;
  order_tracking_id?: string;
  redirect_url?: string;
  ipn_id?: string;
  payment_id?: string;
  status?: string;
  error?: string;
}

interface Props {
  open: boolean;
  plan: Plan | null;
  onClose: () => void;
}

/* ─────────── Component ─────────── */

const PlanPurchaseSheet: React.FC<Props> = ({
  open,
  plan,
  onClose,
}) => {
  const access = useAccessToken();

  const [phone, setPhone] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);

  /* Reset on open */
  useEffect(() => {
    if (!open) return;
    setPhase('form');
    setError(null);
    setPhone('');
  }, [open, plan?.id]);

  /* Escape closes only in form/failed */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'redirecting') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, phase, onClose]);

  /* Body scroll lock */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !plan) return null;

  /* ── Submit → initiate payment → redirect to Pesapal ── */
  const handleSubmit = async () => {
    setError(null);

    if (!access) {
      setError('Please sign in again.');
      return;
    }

    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 9 || cleaned.length > 15) {
      setError('Enter a valid phone number.');
      return;
    }

    setPhase('redirecting');

    try {
      const url = API_ORIGIN
        ? `${API_ORIGIN}/subscription_payments/initialize/`
        : `/subscription_payments/initialize/`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({
          plan_id: plan.id,
          phone_number: phone.trim(),
        }),
      });

      const data: InitiateResponse = await res
        .json()
        .catch(() => ({} as InitiateResponse));

      if (!res.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `Could not start payment (${res.status}).`
        );
      }

      if (!data.redirect_url) {
        throw new Error(
          'The payment gateway did not return a redirect URL.'
        );
      }

      // Persist references so the success page can look them up
      try {
        if (data.payment_id) {
          sessionStorage.setItem('active_payment_id', data.payment_id);
        }
        if (data.merchant_reference) {
          sessionStorage.setItem(
            'active_merchant_reference',
            data.merchant_reference
          );
        }
        if (data.order_tracking_id) {
          sessionStorage.setItem(
            'active_order_tracking_id',
            data.order_tracking_id
          );
        }
        localStorage.setItem('plan_id', String(plan.id));
      } catch {
        /* ignore */
      }

      // Hand off to Pesapal — full page navigation
      window.location.href = data.redirect_url;
    } catch (e) {
      setError((e as Error).message);
      setPhase('failed');
    }
  };

  const isFree = Number(plan.price) === 0;
  const priceLabel = isFree
    ? 'Free'
    : `KES ${Number(plan.price).toLocaleString()}`;

  return createPortal(
    <div
      className="pps-root"
      role="presentation"
      onClick={() => {
        if (phase !== 'redirecting') onClose();
      }}
    >
      <div
        className="pps-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Subscribe to ${plan.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pps-handle" aria-hidden="true" />

        {/* Header */}
        <div className="pps-header">
          <div className="pps-header-left">
            <h3 className="pps-title">
              {phase === 'form' && `Upgrade to ${plan.name}`}
              {phase === 'redirecting' && 'Redirecting to Pesapal…'}
              {phase === 'failed' && 'Payment failed'}
            </h3>
            <span className="pps-subtitle">
              {phase === 'form' && `${priceLabel} · 30 days`}
              {phase === 'redirecting' &&
                'Complete the payment on the next page'}
              {phase === 'failed' && 'Something went wrong'}
            </span>
          </div>

          {phase !== 'redirecting' && (
            <button
              type="button"
              className="pps-close"
              onClick={onClose}
              aria-label="Close"
            >
              <FiX />
            </button>
          )}
        </div>

        {/* ── Form ─────────────────────────────── */}
        {phase === 'form' && (
          <div className="pps-body">
            <div className="pps-plan-summary">
              <div className="pps-plan-row">
                <span className="pps-plan-label">Plan</span>
                <span className="pps-plan-value">{plan.name}</span>
              </div>
              <div className="pps-plan-row">
                <span className="pps-plan-label">Duration</span>
                <span className="pps-plan-value">30 days</span>
              </div>
              <div className="pps-plan-row pps-plan-row--total">
                <span className="pps-plan-label">Total</span>
                <span className="pps-plan-total">{priceLabel}</span>
              </div>
            </div>

            <label className="pps-field">
              <span className="pps-field-label">
                <FiPhone /> Phone number
              </span>
              <input
                type="tel"
                className="pps-input"
                placeholder="07XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
              />
            </label>

            {error && (
              <div className="pps-error">
                <FiAlertCircle /> {error}
              </div>
            )}

            <button
              type="button"
              className="pps-cta"
              onClick={handleSubmit}
              disabled={!phone.trim()}
            >
              Continue to payment
            </button>

            <p className="pps-footnote">
              You'll be redirected to Pesapal to complete the payment
              securely.
            </p>
          </div>
        )}

        {/* ── Redirecting ──────────────────────── */}
        {phase === 'redirecting' && (
          <div className="pps-body pps-body--centered">
            <div className="pps-status-icon pps-status-icon--waiting">
              <FiLoader className="pps-spin" />
            </div>

            <p className="pps-status-title">Redirecting to Pesapal…</p>
            <p className="pps-status-text">
              Hold on. We're opening the payment page for{' '}
              <strong>{plan.name}</strong>.
            </p>
          </div>
        )}

        {/* ── Failed ───────────────────────────── */}
        {phase === 'failed' && (
          <div className="pps-body pps-body--centered">
            <div className="pps-status-icon pps-status-icon--failed">
              <FiAlertCircle />
            </div>

            <p className="pps-status-title">Couldn't start payment</p>
            <p className="pps-status-text">
              {error || 'Please try again.'}
            </p>

            <button
              type="button"
              className="pps-cta pps-cta--ghost"
              onClick={() => setPhase('form')}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default PlanPurchaseSheet;