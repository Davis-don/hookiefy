// src/pages/PaymentResult.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
} from 'react-icons/fi';
import './paymentresult.css';

type Status = 'success' | 'failed' | 'unknown';

function resolveApiOrigin(): string {
  // @ts-ignore
  const envUrl: string | undefined = import.meta.env?.VITE_API_URL;
  if (!envUrl || !envUrl.trim()) return '';
  return envUrl.replace(/\/+$/, '');
}

const API_ORIGIN = resolveApiOrigin();

function readToken(): string | null {
  const keys = ['access_token', 'accessToken', 'access', 'token', 'jwt'];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v && v.trim() && !v.startsWith('{')) return v;
  }
  return null;
}

const PaymentResult: React.FC = () => {
  const [params] = useSearchParams();

  const rawStatus = params.get('status') || '';
  const ref = params.get('ref') || '';
  const reason = params.get('reason') || '';

  const status: Status =
    rawStatus === 'success'
      ? 'success'
      : rawStatus === 'failed'
      ? 'failed'
      : 'unknown';

  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  /* If we have a ref, poll the backend once to confirm the status */
  useEffect(() => {
    if (!ref) return;
    const token = readToken();
    if (!token) return;

    let cancelled = false;

    const fetchStatus = async () => {
      setLoading(true);
      try {
        const url = API_ORIGIN
          ? `${API_ORIGIN}/subscription_payments/status/${ref}/`
          : `/subscription_payments/status/${ref}/`;

        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPaymentData(data);
      } catch {
        /* ignore — we still have the URL params */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, [ref]);

  const isSuccess = useMemo(() => {
    if (paymentData?.is_completed === true) return true;
    return status === 'success';
  }, [paymentData, status]);

  return (
    <div className="pr-root">
      <div className={`pr-card ${isSuccess ? 'pr-card--success' : 'pr-card--failed'}`}>

        {loading && !paymentData ? (
          <>
            <FiLoader className="pr-icon pr-spin" />
            <h1 className="pr-title">Checking payment…</h1>
            <p className="pr-text">
              We're confirming your transaction with PesaPal.
            </p>
          </>
        ) : isSuccess ? (
          <>
            <FiCheckCircle className="pr-icon pr-icon--success" />
            <h1 className="pr-title">Payment successful</h1>
            <p className="pr-text">
              Your subscription has been activated. Enjoy!
            </p>
          </>
        ) : (
          <>
            <FiAlertCircle className="pr-icon pr-icon--failed" />
            <h1 className="pr-title">Payment not completed</h1>
            <p className="pr-text">
              {reason || 'Your transaction was not successful.'}
            </p>
          </>
        )}

        {ref && (
          <p className="pr-ref">
            Reference: <code>{ref}</code>
          </p>
        )}

        <div className="pr-actions">
          <Link to="/" className="pr-btn pr-btn--primary">
            Go to dashboard
          </Link>
          <Link to="/" className="pr-btn pr-btn--ghost">
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;