// src/pages/accounts/components/orders/PaymentDetailsStep.tsx

import {
  MANUAL_GATEWAY_LABELS,
  type ManualGateway,
} from '../orders/gateways';

import './paymentDetailsStep.css';

type Props = {
  gateway: ManualGateway;
  setGateway: (g: ManualGateway) => void;
  amount: string;
  setAmount: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  town: string;
  setTown: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
};

function PaymentDetailsStep({
  gateway,
  setGateway,
  amount,
  setAmount,
  currency,
  setCurrency,
  town,
  setTown,
  phone,
  setPhone,
  note,
  setNote,
}: Props) {
  return (
    <section className="pd-step">
      <div className="pd-grid-2">
        <div className="pd-field">
          <label className="pd-label">Payment method *</label>
          <select
            className="pd-input"
            value={gateway}
            onChange={(e) => setGateway(e.target.value as ManualGateway)}
          >
            {(
              Object.keys(MANUAL_GATEWAY_LABELS) as ManualGateway[]
            ).map((g) => (
              <option key={g} value={g}>
                {MANUAL_GATEWAY_LABELS[g]}
              </option>
            ))}
          </select>
        </div>

        <div className="pd-field">
          <label className="pd-label">Delivery town *</label>
          <input
            className="pd-input"
            required
            value={town}
            onChange={(e) => setTown(e.target.value)}
            placeholder="e.g. Nairobi"
          />
        </div>
      </div>

      <div className="pd-grid-2">
        <div className="pd-field">
          <label className="pd-label">Amount *</label>
          <input
            className="pd-input"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1500.00"
          />
        </div>

        <div className="pd-field">
          <label className="pd-label">Currency *</label>
          <input
            className="pd-input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            maxLength={8}
          />
        </div>
      </div>

      <div className="pd-grid-2">
        <div className="pd-field">
          <label className="pd-label">Contact phone (optional)</label>
          <input
            className="pd-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
          />
        </div>

        <div className="pd-field">
          <label className="pd-label">Reference / note (optional)</label>
          <input
            className="pd-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={120}
            placeholder="cheque #, received by, …"
          />
        </div>
      </div>
    </section>
  );
}

export default PaymentDetailsStep;