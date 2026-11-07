// src/pages/accounts/components/orders/DoneStep.tsx

import type { CreatedPayment } from '../api/orderApi';

import './doneStep.css';

type Props = {
  created: CreatedPayment;
  offerDelivery: boolean;
  setOfferDelivery: (v: boolean) => void;
};

function DoneStep({ created, offerDelivery, setOfferDelivery }: Props) {
  return (
    <section className="dn-step">
      <div className="dn-success">
        <div className="dn-success__icon">✓</div>
        <h3>Payment recorded</h3>
        <p className="dn-muted">
          Reference: <strong>{created.merchant_reference}</strong>
        </p>
        <p className="dn-muted">
          {created.currency} {Number(created.amount).toLocaleString()}
          {' · '}
          {created.quantity} × {created.product_name ?? '—'}
        </p>

        <label className="dn-checkbox">
          <input
            type="checkbox"
            checked={offerDelivery}
            onChange={(e) => setOfferDelivery(e.target.checked)}
          />
          Also create a delivery for this order now.
        </label>
      </div>
    </section>
  );
}

export default DoneStep;