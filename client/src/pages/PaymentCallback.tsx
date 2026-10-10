// src/pages/PaymentCallback.tsx

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/spinner/Spinner';

import {
  syncPayment,
  fetchPaymentStatus,
  type SubscriptionPayment,
} from '../features/accounts/User/api/billingApi';

import './paymentcallback.css';

/* ============================================================
   TYPES
   ============================================================ */

type Phase = 'syncing' | 'success' | 'pending' | 'failed' | 'error';

/* ============================================================
   PAGE
   ============================================================ */

function PaymentCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const access = useAuthStore((s) => s.access);

  const merchantReference =
    params.get('OrderMerchantReference') ||
    params.get('merchant_reference') ||
    '';

  const [phase, setPhase] = useState<Phase>('syncing');
  const [payment, setPayment] = useState<SubscriptionPayment | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  /* ── Not logged in → bounce to login, keeping the URL
        so we can return here after auth. ───────────── */
  useEffect(() => {
    if (!access) {
      navigate('/login', {
        replace: true,
        state: { from: `/payment/callback?${params.toString()}` },
      });
    }
  }, [access, navigate, params]);

  /* ── Sync + poll ──────────────────────────────────── */
  useEffect(() => {
    if (!access) return;
    if (!merchantReference) {
      setPhase('error');
      setErrorMessage(
        'The payment reference is missing from the URL. Please check your billing page.',
      );
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Ask the backend to sync this row from PesaPal.
        // This makes the flow reliable even when the IPN
        // hasn't landed yet.
        const syncResult = await syncPayment(merchantReference);
        if (cancelled) return;

        const synced = syncResult.payment;
        setPayment(synced);

        if (synced.status === 'completed') {
          setPhase('success');
          return;
        }

        if (
          synced.status === 'failed' ||
          synced.status === 'reversed' ||
          synced.status === 'invalid' ||
          synced.status === 'cancelled'
        ) {
          setPhase('failed');
          setErrorMessage(
            synced.error_message ||
              'The gateway reported that the payment did not complete.',
          );
          return;
        }

        // Still pending — poll a few times.
        setPhase('pending');
        const maxAttempts = 6;
        const intervalMs = 2000;

        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((r) => setTimeout(r, intervalMs));
          if (cancelled) return;

          try {
            const latest = await fetchPaymentStatus(merchantReference);
            if (cancelled) return;

            setPayment(latest);

            if (latest.status === 'completed') {
              setPhase('success');
              return;
            }

            if (
              latest.status === 'failed' ||
              latest.status === 'reversed' ||
              latest.status === 'invalid' ||
              latest.status === 'cancelled'
            ) {
              setPhase('failed');
              setErrorMessage(
                latest.error_message ||
                  'The gateway reported that the payment did not complete.',
              );
              return;
            }
          } catch {
            // Network hiccup — keep polling.
          }
        }

        // Timeout waiting for the gateway.
        if (!cancelled) setPhase('pending');
      } catch (err: any) {
        if (cancelled) return;
        setPhase('error');
        setErrorMessage(
          err?.message || 'We could not verify your payment.',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [access, merchantReference]);

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className="paycb-page">
      <div className="paycb-card">

        {/* ── Syncing ───────────────────────────────── */}
        {phase === 'syncing' && (
          <>
            <div className="paycb-spinner">
              <Spinner size={42} color="#2563EB" label="Confirming payment…" />
            </div>
            <h1 className="paycb-title">Confirming your payment</h1>
            <p className="paycb-sub">
              Hold tight — we're checking with the payment provider.
              This usually takes a few seconds.
            </p>
          </>
        )}

        {/* ── Success ───────────────────────────────── */}
        {phase === 'success' && (
          <>
            <div className="paycb-icon paycb-icon--success" aria-hidden="true">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.4"
                strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h1 className="paycb-title">Payment successful</h1>
            <p className="paycb-sub">
              {payment?.plan_name
                ? `You're now subscribed to ${payment.plan_name}.`
                : 'Your subscription has been activated.'}
            </p>

            {payment && (
              <dl className="paycb-details">
                <div>
                  <dt>Amount</dt>
                  <dd>
                    {payment.currency}{' '}
                    {Number(payment.amount).toLocaleString()}
                  </dd>
                </div>
                {payment.confirmation_code && (
                  <div>
                    <dt>Confirmation</dt>
                    <dd>{payment.confirmation_code}</dd>
                  </div>
                )}
                {payment.payment_method && (
                  <div>
                    <dt>Method</dt>
                    <dd>{payment.payment_method}</dd>
                  </div>
                )}
                <div>
                  <dt>Reference</dt>
                  <dd className="paycb-ref">{merchantReference}</dd>
                </div>
              </dl>
            )}

            <div className="paycb-actions">
              <Link to="/useraccount" className="paycb-btn paycb-btn--primary">
                Back to dashboard
              </Link>
              <Link to="/" className="paycb-btn paycb-btn--ghost">
                Back to home
              </Link>
            </div>
          </>
        )}

        {/* ── Pending ───────────────────────────────── */}
        {phase === 'pending' && (
          <>
            <div className="paycb-icon paycb-icon--pending" aria-hidden="true">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 14" />
              </svg>
            </div>

            <h1 className="paycb-title">Payment pending</h1>
            <p className="paycb-sub">
              Your payment is still being processed by the gateway.
              Your subscription will activate automatically as soon as
              we receive confirmation — you don't need to do anything.
            </p>

            {merchantReference && (
              <p className="paycb-ref-block">
                <span className="paycb-ref-label">Reference</span>
                <span className="paycb-ref">{merchantReference}</span>
              </p>
            )}

            <div className="paycb-actions">
              <Link to="/useraccount" className="paycb-btn paycb-btn--primary">
                Check my billing
              </Link>
              <Link to="/" className="paycb-btn paycb-btn--ghost">
                Back to home
              </Link>
            </div>
          </>
        )}

        {/* ── Failed ────────────────────────────────── */}
        {phase === 'failed' && (
          <>
            <div className="paycb-icon paycb-icon--failed" aria-hidden="true">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.4"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>

            <h1 className="paycb-title">Payment failed</h1>
            <p className="paycb-sub">
              {errorMessage ||
                'The payment was not completed. You have not been charged.'}
            </p>

            {merchantReference && (
              <p className="paycb-ref-block">
                <span className="paycb-ref-label">Reference</span>
                <span className="paycb-ref">{merchantReference}</span>
              </p>
            )}

            <div className="paycb-actions">
              <Link to="/useraccount" className="paycb-btn paycb-btn--primary">
                Try again from Billing
              </Link>
              <Link to="/" className="paycb-btn paycb-btn--ghost">
                Back to home
              </Link>
            </div>
          </>
        )}

        {/* ── Error ─────────────────────────────────── */}
        {phase === 'error' && (
          <>
            <div className="paycb-icon paycb-icon--failed" aria-hidden="true">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16" x2="12" y2="16.01" />
              </svg>
            </div>

            <h1 className="paycb-title">Something went wrong</h1>
            <p className="paycb-sub">
              {errorMessage || 'We could not verify your payment.'}
            </p>

            <div className="paycb-actions">
              <Link to="/useraccount" className="paycb-btn paycb-btn--primary">
                Open Billing
              </Link>
              <Link to="/" className="paycb-btn paycb-btn--ghost">
                Back to home
              </Link>
            </div>
          </>
        )}

        {/* Footer note */}
        <p className="paycb-foot">
          Need help? Email{' '}
          <a href="mailto:support@youpata.co.ke">support@youpata.co.ke</a>
        </p>
      </div>
    </div>
  );
}

export default PaymentCallback;