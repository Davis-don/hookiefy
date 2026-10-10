// src/pages/accounts/User/components/BillingPaymentModal.tsx

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useToast } from '../../../../components/toast/ToastContext';
import { Spinner } from '../../../../components/spinner/Spinner';

import {
  initiatePayment,
  type Plan,
} from '../api/billingApi';

import './billingpaymentmodal.css';

type BillingPaymentModalProps = {
  plan: Plan | null;
  open: boolean;
  defaultPhone?: string;
  email?: string;
  onClose: () => void;
};

function BillingPaymentModal({
  plan,
  open,
  defaultPhone = '',
  email = '',
  onClose,
}: BillingPaymentModalProps) {
  const toast = useToast();

  const [phone, setPhone] = useState(defaultPhone);
  const [error, setError] = useState('');

  /* ── Reset the input whenever the modal opens with a
        new plan, and lock body scroll while open. ──── */
  useEffect(() => {
    if (!open) return;

    setPhone(defaultPhone);
    setError('');

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, defaultPhone, onClose]);

  /* ── Mutation ─────────────────────────────────────── */
  const initiateMutation = useMutation({
    mutationFn: (phoneNumber: string) =>
      initiatePayment(plan!.slug, phoneNumber || undefined),
    onSuccess: (res) => {
      if (!res.redirect_url) {
        toast.error(
          'The payment gateway did not return a redirect URL.',
        );
        return;
      }
      // Hand off to PesaPal.
      window.location.href = res.redirect_url;
    },
    onError: (err: any) => {
      setError(err?.message || 'Could not start the payment.');
    },
  });

  /* ── Submit ───────────────────────────────────────── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = phone.trim();

    // Very light validation — PesaPal accepts most formats,
    // but we want something that looks like a phone number.
    if (trimmed && !/^[+]?[0-9\s-]{7,20}$/.test(trimmed)) {
      setError('Please enter a valid phone number.');
      return;
    }

    initiateMutation.mutate(trimmed);
  };

  if (!open || !plan) return null;

  const saving = initiateMutation.isPending;

  return (
    <div
      className="paymodal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Subscribe to ${plan.plan_name}`}
      onClick={onClose}
    >
      <div
        className="paymodal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Head */}
        <header className="paymodal-head">
          <div>
            <span className="paymodal-eyebrow">
              Subscribe
            </span>
            <h2 className="paymodal-title">
              {plan.plan_name}
            </h2>
          </div>

          <button
            type="button"
            className="paymodal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Price summary */}
        <div className="paymodal-summary">
          <span className="paymodal-amount">
            {plan.price_display}
          </span>
          {!plan.is_free && (
            <span className="paymodal-cycle">
              {plan.billing_cycle === 'monthly' && 'per month'}
              {plan.billing_cycle === 'yearly' && 'per year'}
              {plan.billing_cycle === 'lifetime' && 'one-time'}
            </span>
          )}
        </div>

        {/* Form */}
        <form
          className="paymodal-form"
          onSubmit={handleSubmit}
          noValidate
        >
          {/* Read-only email */}
          {email && (
            <div className="paymodal-field">
              <label htmlFor="pm-email">Email</label>
              <input
                id="pm-email"
                type="email"
                value={email}
                disabled
                readOnly
              />
              <span className="paymodal-hint">
                The receipt will be sent to this address.
              </span>
            </div>
          )}

          {/* Phone */}
          <div className="paymodal-field">
            <label htmlFor="pm-phone">
              Phone number
              <span className="paymodal-optional"> (optional)</span>
            </label>
            <input
              id="pm-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+254 712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
            />
            <span className="paymodal-hint">
              Used to notify you when the payment completes. You can
              leave this blank and use your account number.
            </span>
          </div>

          {error && <p className="paymodal-error">{error}</p>}

          {/* Actions */}
          <div className="paymodal-actions">
            <button
              type="button"
              className="paymodal-btn paymodal-btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="paymodal-btn paymodal-btn-primary"
              disabled={saving}
            >
              {saving ? (
                <span className="paymodal-btn-spinner">
                  <Spinner size={16} label="Redirecting…" />
                </span>
              ) : (
                <>
                  Pay {plan.price_display}
                </>
              )}
            </button>
          </div>

          <p className="paymodal-terms">
            You'll be redirected to PesaPal to complete the payment.
          </p>
        </form>
      </div>
    </div>
  );
}

export default BillingPaymentModal;