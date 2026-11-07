// src/pages/accounts/components/orders/AddOrderWizard.tsx

import { useEffect, useState } from 'react';

import { useAuthStore } from '../../../../store/authStore';
import { useToast } from '../../../../components/toast/ToastContext';
import {
  createManualPayment,
  type CreatedPayment,
  type ManualGateway,
  type ProductLookup,
  type UserLookup,
} from '../api/orderApi';

import VerifyUserStep from './VerifyUserStep';
import VerifyProductStep from './VerifyProductStep';
import PaymentDetailsStep from './PaymentDetailsStep';
import ReviewStep from './ReviewStep';
import DoneStep from './DoneStep';

import type { ManualDeliveryOrderInput } from '../components/ManualDeliveryModal';

import './ordermodal.css';

type WizardStep = 'user' | 'product' | 'payment' | 'review' | 'done';

type Props = {
  onClose: () => void;
  onCreated: (created: CreatedPayment) => void;
  onSaved: () => void;
  onRequestDelivery: (order: ManualDeliveryOrderInput) => void;
};

function AddOrderWizard({
  onClose,
  onCreated,
  onSaved,
  onRequestDelivery,
}: Props) {
  const access = useAuthStore((s) => s.access);
  const toast = useToast();

  const [step, setStep] = useState<WizardStep>('user');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Step state */
  const [user, setUser] = useState<UserLookup | null>(null);
  const [userConfirmed, setUserConfirmed] = useState(false);

  const [product, setProduct] = useState<ProductLookup | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [productConfirmed, setProductConfirmed] = useState(false);

  const [gateway, setGateway] = useState<ManualGateway>('manual_bank');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [town, setTown] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');

  const [created, setCreated] = useState<CreatedPayment | null>(null);
  const [offerDelivery, setOfferDelivery] = useState(false);

  /* Keep amount synced to price × qty whenever they change */
  useEffect(() => {
    if (!product?.price) return;
    const price = Number(product.price);
    const q = Number(quantity);
    if (!Number.isFinite(price) || !Number.isFinite(q) || q <= 0) return;
    setAmount((price * q).toFixed(2));
  }, [product, quantity]);

  /* Escape closes unless mid-request */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, busy]);

  /* Guards for Next */
  const canGoUser = !!user && userConfirmed && !busy;
  const canGoProduct = !!product && productConfirmed && !busy;
  const canGoPayment = !busy;
  const canSubmit = !busy;

  const proceedUser = () => {
    if (!user) return;
    if (user.phone_number && !phone) setPhone(user.phone_number);
    setError(null);
    setStep('product');
  };

  const proceedProduct = () => {
    if (!product) return;
    if (!quantity || Number(quantity) < 1) {
      setError('Quantity must be at least 1.');
      return;
    }
    setError(null);
    setStep('payment');
  };

  const proceedPayment = () => {
    if (!amount || Number(amount) <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!town.trim()) {
      setError('Delivery town is required.');
      return;
    }
    setError(null);
    setStep('review');
  };

  const submit = async () => {
    if (!product || !user) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await createManualPayment(access, {
        product_id: product.id,
        user_email: user.email,
        quantity: Number(quantity),
        amount: amount.trim(),
        currency: currency.trim() || 'KES',
        town: town.trim(),
        gateway,
        phone_number: phone.trim(),
        note: note.trim(),
      });

      if (resp.stock_warning) toast.success(resp.stock_warning);
      toast.success('Manual payment recorded.');

      setCreated(resp.payment);
      onCreated(resp.payment);
      setStep('done');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const buildDeliveryOrder = (): ManualDeliveryOrderInput | null => {
    if (!created) return null;
    return {
      merchant_reference: created.merchant_reference,
      product: created.product,
      product_name: created.product_name,
      business: created.business,
      business_name: created.business_name,
      quantity: created.quantity,
      town: created.town,
      email: created.email,
      phone_number: created.phone_number,
    };
  };

  const stepIndex: Record<WizardStep, number> = {
    user: 1,
    product: 2,
    payment: 3,
    review: 4,
    done: 5,
  };
  const currentIndex = stepIndex[step];

  const headerHint =
    step === 'done'
      ? null
      : `Step ${currentIndex} of 4 — ${
          step === 'user'
            ? 'Verify the buyer'
            : step === 'product'
              ? 'Pick the product'
              : step === 'payment'
                ? 'Payment details'
                : 'Review & record'
        }`;

  return (
    <div
      className="om-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-order-title"
      onClick={() => !busy && onClose()}
    >
      <div
        className="om-modal om-modal--wide"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="om-modal__header">
          <div>
            <h3 id="add-order-title">Add order</h3>
            {headerHint && <p className="om-step-hint">{headerHint}</p>}
          </div>
          <button
            type="button"
            className="om-modal__close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="om-step-bar" aria-hidden="true">
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={
                'om-step-bar__dot' +
                (n < currentIndex ? ' is-done' : '') +
                (n === currentIndex ? ' is-active' : '')
              }
            />
          ))}
        </div>

        <div className="om-modal__body">
          {step === 'user' && (
            <VerifyUserStep
              user={user}
              onChange={(u) => {
                setUser(u);
                setUserConfirmed(false);
              }}
              onConfirmedChange={setUserConfirmed}
              onBusyChange={setBusy}
              onError={setError}
            />
          )}

          {step === 'product' && (
            <VerifyProductStep
              product={product}
              quantity={quantity}
              currency={currency}
              onChange={(p) => {
                setProduct(p);
                setProductConfirmed(false);
              }}
              onQuantityChange={setQuantity}
              onConfirmedChange={setProductConfirmed}
              onBusyChange={setBusy}
              onError={setError}
            />
          )}

          {step === 'payment' && (
            <PaymentDetailsStep
              gateway={gateway}
              setGateway={setGateway}
              amount={amount}
              setAmount={setAmount}
              currency={currency}
              setCurrency={setCurrency}
              town={town}
              setTown={setTown}
              phone={phone}
              setPhone={setPhone}
              note={note}
              setNote={setNote}
            />
          )}

          {step === 'review' && product && user && (
            <ReviewStep
              user={user}
              product={product}
              quantity={quantity}
              amount={amount}
              currency={currency}
              town={town}
              gateway={gateway}
              note={note}
            />
          )}

          {step === 'done' && created && (
            <DoneStep
              created={created}
              offerDelivery={offerDelivery}
              setOfferDelivery={setOfferDelivery}
            />
          )}

          {error && <div className="om-error">{error}</div>}
        </div>

        <footer className="om-modal__footer">
          {step !== 'user' && step !== 'done' && (
            <button
              type="button"
              className="om-btn om-btn--ghost"
              onClick={() => {
                setError(null);
                if (step === 'product') setStep('user');
                else if (step === 'payment') setStep('product');
                else if (step === 'review') setStep('payment');
              }}
              disabled={busy}
            >
              ← Back
            </button>
          )}

          <div style={{ flex: 1 }} />

          {step !== 'done' ? (
            <button
              type="button"
              className="om-btn om-btn--ghost"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              className="om-btn om-btn--ghost"
              onClick={onSaved}
              disabled={busy}
            >
              Close
            </button>
          )}

          {step === 'user' && (
            <button
              type="button"
              className="om-btn om-btn--primary"
              onClick={proceedUser}
              disabled={!canGoUser}
            >
              Next: Product →
            </button>
          )}

          {step === 'product' && (
            <button
              type="button"
              className="om-btn om-btn--primary"
              onClick={proceedProduct}
              disabled={!canGoProduct}
            >
              Next: Payment →
            </button>
          )}

          {step === 'payment' && (
            <button
              type="button"
              className="om-btn om-btn--primary"
              onClick={proceedPayment}
              disabled={!canGoPayment}
            >
              Next: Review →
            </button>
          )}

          {step === 'review' && (
            <button
              type="button"
              className="om-btn om-btn--primary"
              onClick={() => void submit()}
              disabled={!canSubmit}
            >
              {busy ? 'Recording…' : 'Record payment'}
            </button>
          )}

          {step === 'done' && offerDelivery && (
            <button
              type="button"
              className="om-btn om-btn--primary"
              onClick={() => {
                const order = buildDeliveryOrder();
                if (!order) return;
                onRequestDelivery(order);
                onSaved();
              }}
              disabled={busy}
            >
              Create delivery →
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

export default AddOrderWizard;