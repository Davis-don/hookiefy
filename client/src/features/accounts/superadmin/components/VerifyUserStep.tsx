// src/pages/accounts/components/orders/VerifyUserStep.tsx

import { useState } from 'react';

import { useAuthStore } from '../../../../store/authStore';
import { lookupUserByEmail, type UserLookup } from '../api/orderApi';

import './verifyUserStep.css';

type Props = {
  user: UserLookup | null;
  onChange: (user: UserLookup | null) => void;
  onConfirmedChange: (ok: boolean) => void;
  onBusyChange: (busy: boolean) => void;
  onError: (msg: string | null) => void;
};

function VerifyUserStep({
  user,
  onChange,
  onConfirmedChange,
  onBusyChange,
  onError,
}: Props) {
  const access = useAuthStore((s) => s.access);
  const [email, setEmail] = useState(user?.email ?? '');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const doLookup = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    onBusyChange(true);
    onError(null);
    onChange(null);
    onConfirmedChange(false);
    setConfirmed(false);
    try {
      const data = await lookupUserByEmail(access, trimmed);
      onChange(data);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  };

  return (
    <section className="vu-step">
      <div className="vu-field">
        <label className="vu-label">Buyer email *</label>
        <div className="vu-row">
          <input
            className="vu-input"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              onChange(null);
              onConfirmedChange(false);
              setConfirmed(false);
            }}
            placeholder="buyer@example.com"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void doLookup();
              }
            }}
          />
          <button
            type="button"
            className="vu-btn vu-btn--ghost"
            onClick={() => void doLookup()}
            disabled={busy || !email.trim()}
          >
            {busy ? 'Looking…' : 'Look up'}
          </button>
        </div>
        <p className="vu-hint">
          If the buyer has no account, leave the fields below blank —
          the payment will still be recorded with the email as a snapshot.
        </p>
      </div>

      {user && (
        <div className="vu-card">
          <div className="vu-card__title">Verify account details</div>

          <Row label="Full name" value={user.full_name || '—'} />
          <Row label="Email" value={user.email} />
          <Row label="Phone" value={user.phone_number || '—'} />
          <Row
            label="Joined"
            value={new Date(user.date_joined).toLocaleDateString()}
          />
          <Row
            label="Status"
            value={`${user.is_active ? 'Active' : 'Inactive'}${user.is_staff ? ' · Staff' : ''}`}
          />

          <label className="vu-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked);
                onConfirmedChange(e.target.checked);
              }}
            />
            These details are correct and belong to the buyer.
          </label>
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="vu-card__row">
      <span className="vu-card__label">{label}</span>
      <span className="vu-card__value">{value}</span>
    </div>
  );
}

export default VerifyUserStep;