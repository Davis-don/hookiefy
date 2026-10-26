// src/components/feed/ProductPayment.tsx

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../../../store/authStore';
import { Spinner } from '../../../../../components/spinner/Spinner';

import {
  fetchProductPrice,
  initiateProductPayment,
} from '../../api/productPaymentApi';

import './productPayment.css';

type ProductPaymentProps = {
  productId: number;
  /** If the caller already has the product name and price,
      pass them in to skip the extra product fetch. */
  productName?: string;
  priceDisplay?: string;
  /** Optional default town — usually the user's profile town. */
  defaultTown?: string;
  onBack: () => void;
  onOpenBusiness?: (businessId: number) => void;
};

function ProductPayment({
  productId,
  productName: productNameProp,
  priceDisplay: priceDisplayProp,
  defaultTown,
  onBack,
}: ProductPaymentProps) {
  const access = useAuthStore((s) => s.access);
  const user = useAuthStore((s) => s.user);

  // ── The two fields the client supplies ────────────────
  //
  // town is required — the only typed input.
  // phone is optional — a contact override for PesaPal.
  //
  // Pre-fill both from the user's profile where possible,
  // so the client only *changes* them if this order is
  // going somewhere else or the profile phone is wrong.
  const [town, setTown] = useState(
    defaultTown ||
    (user as any)?.city_town ||
    (user as any)?.town ||
    '',
  );
  const [phone, setPhone] = useState(
    (user as any)?.phone_number ?? '',
  );
  const [error, setError] = useState('');

  /* ── Product info (price + name) ───────────────── */
  const needsFetch = !productNameProp || !priceDisplayProp;

  const {
    data: productInfo,
    isLoading: productLoading,
    isError: productError,
    error: productFetchError,
  } = useQuery({
    queryKey: ['product-price', productId],
    queryFn: () => fetchProductPrice(access, productId),
    enabled: needsFetch && !!access && productId > 0,
    staleTime: 60_000,
  });

  const productName = productNameProp ?? productInfo?.name ?? 'this item';

  const priceDisplay = (() => {
    if (priceDisplayProp) return priceDisplayProp;
    if (!productInfo?.price) return null;

    const unit = Number(productInfo.price);
    if (Number.isNaN(unit)) return null;
    // Quantity is always 1 — a single heavy item per purchase.
    return `KES ${unit.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  })();

  /* ── Initiate payment ───────────────────────────── */
  const initiateMutation = useMutation({
    mutationFn: (payload: { town: string; phone: string }) =>
      initiateProductPayment(access, productId, payload),
    onSuccess: (res) => {
      if (!res.redirect_url) {
        setError('The payment gateway did not return a redirect URL.');
        return;
      }
      window.location.href = res.redirect_url;
    },
    onError: (err: any) => {
      setError(err?.message || 'Could not start the payment.');
    },
  });

  /* ── Reset when product changes ────────────────── */
  useEffect(() => {
    setError('');
    setTown(
      defaultTown ||
      (user as any)?.city_town ||
      (user as any)?.town ||
      '',
    );
    setPhone((user as any)?.phone_number ?? '');
  }, [productId, user, defaultTown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const townTrimmed = town.trim();
    if (!townTrimmed) {
      setError('Please enter the delivery town.');
      return;
    }
    if (townTrimmed.length > 200) {
      setError('Delivery town cannot exceed 200 characters.');
      return;
    }

    const phoneTrimmed = phone.trim();
    if (phoneTrimmed && !/^[+]?[0-9\s-]{7,20}$/.test(phoneTrimmed)) {
      setError('Please enter a valid phone number.');
      return;
    }

    initiateMutation.mutate({
      town: townTrimmed,
      phone: phoneTrimmed,
    });
  };

  const saving = initiateMutation.isPending;
  const productBlocked = productError;

  /* ── Product load failure ──────────────────────── */
  if (needsFetch && productBlocked) {
    return (
      <div className="product-payment">
        <button
          type="button"
          className="product-payment__back"
          onClick={onBack}
        >
          ← Back
        </button>
        <p className="product-payment__error">
          {(productFetchError as Error)?.message ||
            'Could not load this product.'}
        </p>
      </div>
    );
  }

  /* ── Initial product load ──────────────────────── */
  if (needsFetch && productLoading) {
    return (
      <div className="product-payment product-payment--center">
        <Spinner size={20} color="#2563EB" label="Preparing payment…" />
      </div>
    );
  }

  /* ── No price → product not purchasable ────────── */
  if (!priceDisplay) {
    return (
      <div className="product-payment">
        <button
          type="button"
          className="product-payment__back"
          onClick={onBack}
        >
          ← Back
        </button>
        <p className="product-payment__error">
          This product has no price set and cannot be purchased.
        </p>
      </div>
    );
  }

  return (
    <div className="product-payment">
      <button
        type="button"
        className="product-payment__back"
        onClick={onBack}
        disabled={saving}
      >
        ← Back
      </button>

      <header className="product-payment__head">
        <span className="product-payment__eyebrow">Buy</span>
        <h1 className="product-payment__title">{productName}</h1>
      </header>

      <div className="product-payment__summary">
        <span className="product-payment__amount">{priceDisplay}</span>
      </div>

      <form
        className="product-payment__form"
        onSubmit={handleSubmit}
        noValidate
      >
        {user?.email && (
          <div className="product-payment__field">
            <label htmlFor="pp-email">Email</label>
            <input
              id="pp-email"
              type="email"
              value={user.email}
              disabled
              readOnly
            />
            <span className="product-payment__hint">
              The receipt will be sent to this address.
            </span>
          </div>
        )}

        {/* ── Town — required, the only field the client types ── */}
        <div className="product-payment__field">
          <label htmlFor="pp-town">
            Deliver to
            <span className="product-payment__required"> *</span>
          </label>
          <input
            id="pp-town"
            type="text"
            autoComplete="address-level2"
            placeholder="e.g. Nairobi"
            value={town}
            onChange={(e) => setTown(e.target.value)}
            disabled={saving}
            required
          />
          <span className="product-payment__hint">
            The town or city where this item should be delivered.
          </span>
        </div>

        <div className="product-payment__field">
          <label htmlFor="pp-phone">
            Phone number
            <span className="product-payment__optional"> (optional)</span>
          </label>
          <input
            id="pp-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+254 712 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={saving}
          />
          <span className="product-payment__hint">
            Used to notify you when the payment completes.
          </span>
        </div>

        {error && <p className="product-payment__error">{error}</p>}

        <div className="product-payment__actions">
          <button
            type="button"
            className="product-payment__btn product-payment__btn--ghost"
            onClick={onBack}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="product-payment__btn product-payment__btn--primary"
            disabled={saving}
          >
            {saving ? (
              <span className="product-payment__btn-spinner">
                <Spinner size={16} label="Redirecting…" />
              </span>
            ) : (
              <>Pay {priceDisplay}</>
            )}
          </button>
        </div>

        <p className="product-payment__terms">
          You'll be redirected to PesaPal to complete the payment.
        </p>
      </form>
    </div>
  );
}

export default ProductPayment;