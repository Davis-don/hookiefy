// src/pages/accounts/components/orders/ReviewStep.tsx

import type { ProductLookup, UserLookup } from '../api/orderApi';
import { MANUAL_GATEWAY_LABELS, type ManualGateway } from '../orders/gateways';

import './reviewStep.css';

type Props = {
  user: UserLookup;
  product: ProductLookup;
  quantity: string;
  amount: string;
  currency: string;
  town: string;
  gateway: ManualGateway;
  note: string;
};

function ReviewStep({
  user,
  product,
  quantity,
  amount,
  currency,
  town,
  gateway,
  note,
}: Props) {
  const exceedsStock = Number(quantity) > (product.quantity ?? 0);

  return (
    <section className="rv-step">
      <div className="rv-review">
        <div className="rv-section">
          <h4>Buyer</h4>
          <p>{user.full_name || user.email}</p>
          <p className="rv-muted">{user.email}</p>
        </div>

        <div className="rv-section">
          <h4>Product</h4>
          <p>
            {product.name}{' '}
            <span className="rv-muted">× {quantity}</span>
          </p>
          <p className="rv-muted">Seller: {product.business_name}</p>
        </div>

        <div className="rv-section">
          <h4>Payment</h4>
          <p>
            {currency} {Number(amount).toLocaleString()}
          </p>
          <p className="rv-muted">
            {MANUAL_GATEWAY_LABELS[gateway]} · {town}
          </p>
          {note && <p className="rv-muted">{note}</p>}
        </div>
      </div>

      {exceedsStock && (
        <div className="rv-hint rv-hint--warn">
          Quantity exceeds available stock — stock will be
          clamped to 0 after this order is recorded.
        </div>
      )}
    </section>
  );
}

export default ReviewStep;