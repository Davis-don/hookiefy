// src/pages/accounts/components/orders/VerifyProductStep.tsx

import { useEffect, useState } from 'react';

import { useAuthStore } from '../../../../store/authStore';
import {
  lookupProductById,
  type ProductLookup,
} from '../api/orderApi';

import './verifyProductStep.css';

type Props = {
  product: ProductLookup | null;
  quantity: string;
  currency: string;
  onChange: (product: ProductLookup | null) => void;
  onQuantityChange: (q: string) => void;
  onConfirmedChange: (ok: boolean) => void;
  onBusyChange: (busy: boolean) => void;
  onError: (msg: string | null) => void;
};

function VerifyProductStep({
  product,
  quantity,
  currency,
  onChange,
  onQuantityChange,
  onConfirmedChange,
  onBusyChange,
  onError,
}: Props) {
  const access = useAuthStore((s) => s.access);
  const [productId, setProductId] = useState<string>(
    product ? String(product.id) : '',
  );
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localHint, setLocalHint] = useState<string | null>(null);

  const doLookup = async () => {
    const raw = productId.trim();
    if (!raw) return;
    setBusy(true);
    onBusyChange(true);
    onError(null);
    setLocalHint(null);
    onChange(null);
    onConfirmedChange(false);
    setConfirmed(false);
    try {
      const data = await lookupProductById(access, raw);
      onChange(data);
    } catch (e) {
      const msg = (e as Error).message || 'Product not found.';
      setLocalHint(msg);
      onError(msg);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  };

  // Clamp quantity to >= 1. Only fires when the value actually
  // needs changing, so this can't loop.
  useEffect(() => {
    const q = Number(quantity);
    if (!Number.isFinite(q) || q < 1) {
      if (quantity !== '1') onQuantityChange('1');
    }
  }, [quantity, onQuantityChange]);

  const exceedsStock =
    product != null && Number(quantity) > product.quantity;

  return (
    <section className="vp-step">
      <div className="vp-field">
        <label className="vp-label">Product ID *</label>
        <div className="vp-row">
          <input
            className="vp-input"
            type="number"
            min="1"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setLocalHint(null);
              onChange(null);
              onConfirmedChange(false);
              setConfirmed(false);
            }}
            placeholder="e.g. 42"
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
            className="vp-btn vp-btn--ghost"
            onClick={() => void doLookup()}
            disabled={busy || !productId.trim()}
          >
            {busy ? 'Looking…' : 'Look up'}
          </button>
        </div>
        {localHint && <p className="vp-hint vp-hint--error">{localHint}</p>}
      </div>

      {product && (
        <div className="vp-card">
          <div className="vp-card__title">Verify product details</div>

          <div className="vp-preview">
            {product.primary_image_url ? (
              <img
                className="vp-preview__img"
                src={product.primary_image_url}
                alt={product.name}
              />
            ) : (
              <div className="vp-preview__img vp-preview__img--empty" />
            )}

            <div className="vp-preview__meta">
              <Row label="Name" value={product.name} />
              <Row
                label="Seller"
                value={`${product.business_name} (#${product.business})`}
              />
              <Row
                label="Unit price"
                value={
                  product.price
                    ? `${currency} ${Number(product.price).toLocaleString()}`
                    : '— (no price set)'
                }
              />
              <Row
                label="In stock"
                value={`${product.quantity} unit${product.quantity === 1 ? '' : 's'}`}
              />
            </div>
          </div>

          <div className="vp-field" style={{ marginTop: 12 }}>
            <label className="vp-label">Quantity *</label>
            <input
              className="vp-input"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => onQuantityChange(e.target.value)}
            />
            {exceedsStock && (
              <p className="vp-hint vp-hint--warn">
                Requested quantity exceeds stock — the row will
                still be recorded, but stock will be clamped to 0.
              </p>
            )}
          </div>

          <label className="vp-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked);
                onConfirmedChange(e.target.checked);
              }}
            />
            This is the correct product and quantity.
          </label>
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="vp-card__row">
      <span className="vp-card__label">{label}</span>
      <span className="vp-card__value">{value}</span>
    </div>
  );
}

export default VerifyProductStep;