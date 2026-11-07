// src/features/accounts/superadmin/components/ManualDeliveryModal.tsx

import { useEffect, useState } from 'react';

import { useAuthStore } from '../../../../store/authStore';
import { useToast } from '../../../../components/toast/ToastContext';

import './ordermodal.css';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ── Types ──────────────────────────────────────────── */

type DeliveryStatus = 'pending' | 'delivered' | 'failed';

const STATUSES: { value: DeliveryStatus; label: string }[] = [
  { value: 'pending',   label: 'Pending' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed',    label: 'Failed' },
];

/**
 * The subset of OrderRow this modal needs. Deliberately
 * narrower than OrderRow so the modal can be reused anywhere
 * that has an order summary — the Orders tab, a future
 * order-detail page, a "re-deliver" action — without
 * dragging in the full row type.
 *
 * `merchant_reference` is the one required field: the backend
 * uses it to look up the ProductPayment and derive client,
 * product, business, and default town/quantity from it.
 */
export type ManualDeliveryOrderInput = {
  merchant_reference: string;
  product: number | null;
  product_name: string | null;
  business: number | null;
  business_name: string | null;
  quantity: number;
  town: string | null;
  email: string | null;
  phone_number: string | null;
};

type Props = {
  order: ManualDeliveryOrderInput;
  onClose: () => void;
  onSaved: () => void;
};

/* ── Component ──────────────────────────────────────── */

function ManualDeliveryModal({ order, onClose, onSaved }: Props) {
  const access = useAuthStore((s) => s.access);
  const toast = useToast();

  // Pre-fill from the order — the admin usually just
  // confirms and hits "Create".
  const [town, setTown] = useState(order.town ?? '');
  const [quantity, setQuantity] = useState(String(order.quantity || 1));
  const [status, setStatus] = useState<DeliveryStatus>('pending');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Escape / body-lock while open ──────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, saving]);

  /* ── Submit ─────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!town.trim()) {
      setError('Delivery town is required.');
      return;
    }

    const q = Number(quantity);
    if (!Number.isFinite(q) || q < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

    setSaving(true);
    setError(null);

    /*
     * The backend derives client / product / business from the
     * linked payment_reference. So the payload is minimal:
     *
     *   payment_reference  ← tells the backend which payment
     *                        to derive from (also links the
     *                        delivery to it via the OneToOne)
     *   town               ← admin can override the payment's
     *                        town if the buyer asked for a
     *                        different destination
     *   quantity           ← usually 1, but re-deliveries can
     *                        be >1
     *   status             ← pending/delivered/failed
     *   notes              ← optional free text
     *
     * product, business, client, delivered_by, delivered_to
     * are NOT sent — the view fills them from the payment and
     * from sensible defaults (business owner as courier, buyer
     * as recipient).
     */
    const payload = {
      payment_reference: order.merchant_reference,
      town: town.trim(),
      quantity: q,
      status,
      notes: notes.trim() || undefined,
    };

    try {
      // ── FIX: /deliveries/create/ not /deliveries/ ───
      const res = await fetch(`${API_BASE}/deliveries/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        const detail =
          (data && (data.detail || data.message)) ||
          (data && Object.values(data)[0]) ||
          'Could not create delivery.';
        throw new Error(Array.isArray(detail) ? detail[0] : String(detail));
      }

      toast.success('Delivery created.');
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div
      className="om-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-delivery-title"
      onClick={() => !saving && onClose()}
    >
      <div className="om-modal" onClick={(e) => e.stopPropagation()}>
        <header className="om-modal__header">
          <div>
            <h3 id="manual-delivery-title">Create delivery</h3>
            <p className="om-step-hint">
              For order <strong>{order.merchant_reference}</strong>
            </p>
          </div>
          <button
            type="button"
            className="om-modal__close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="om-modal__body">
          {/* ── Read-only order summary ──────────────── */}
          <section className="om-verify-card om-verify-card--static">
            <div className="om-verify-card__title">Order</div>

            <div className="om-verify-card__row">
              <span className="om-label">Product</span>
              <span className="om-value">
                {order.product_name ?? '—'}{' '}
                <span className="om-muted">
                  (#{order.product ?? '—'})
                </span>
              </span>
            </div>

            <div className="om-verify-card__row">
              <span className="om-label">Seller</span>
              <span className="om-value">
                {order.business_name ?? '—'}
              </span>
            </div>

            <div className="om-verify-card__row">
              <span className="om-label">Buyer</span>
              <span className="om-value">
                {order.email ?? '—'}
              </span>
            </div>

            <div className="om-verify-card__row">
              <span className="om-label">Order qty</span>
              <span className="om-value">{order.quantity}</span>
            </div>
          </section>

          {/* ── Editable fields ──────────────────────── */}
          <form className="om-modal__form" onSubmit={handleSubmit}>
            <div className="om-field">
              <label className="om-label">Delivery town *</label>
              <input
                className="om-input"
                required
                value={town}
                onChange={(e) => setTown(e.target.value)}
                placeholder="e.g. Nairobi"
                disabled={saving}
              />
              <p className="om-hint">
                Pre-filled from the order — edit only if the buyer
                asked for a different destination.
              </p>
            </div>

            <div className="om-grid-2">
              <div className="om-field">
                <label className="om-label">Quantity *</label>
                <input
                  className="om-input"
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="om-field">
                <label className="om-label">Status *</label>
                <select
                  className="om-input"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as DeliveryStatus)
                  }
                  disabled={saving}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="om-field">
              <label className="om-label">Notes (optional)</label>
              <textarea
                className="om-input om-input--textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="e.g. buyer requested weekend drop-off"
                disabled={saving}
              />
            </div>

            {error && <div className="om-error">{error}</div>}

            <footer className="om-modal__footer">
              <button
                type="button"
                className="om-btn om-btn--ghost"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="om-btn om-btn--primary"
                disabled={saving}
              >
                {saving ? 'Creating…' : 'Create delivery'}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ManualDeliveryModal;