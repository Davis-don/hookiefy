// plans/ContactFees.tsx
import { useState } from 'react';
import './contactfees.css'
import {
  FiPhoneCall,
  FiMessageCircle,
  FiMail,
  FiSave,
  FiInfo,
  FiAlertCircle,
} from 'react-icons/fi';
import { toast } from 'sonner';

interface ContactFee {
  id: 'phone' | 'message' | 'email';
  label: string;
  description: string;
  icon: React.ReactNode;
  amount: number;
  enabled: boolean;
  color: 'blue' | 'emerald' | 'amber';
}

const DEFAULTS: ContactFee[] = [
  {
    id: 'phone',
    label: 'Phone Reveal Fee',
    description:
      'Amount deducted from a provider’s wallet when a customer unlocks their phone number.',
    icon: <FiPhoneCall />,
    amount: 50,
    enabled: true,
    color: 'blue',
  },
  {
    id: 'message',
    label: 'Direct Message Fee',
    description:
      'Charged when a customer initiates a chat with a provider through Youpata.',
    icon: <FiMessageCircle />,
    amount: 20,
    enabled: true,
    color: 'emerald',
  },
  {
    id: 'email',
    label: 'Email Reveal Fee',
    description:
      'Charged when a customer unlocks a provider’s business email address.',
    icon: <FiMail />,
    amount: 30,
    enabled: false,
    color: 'amber',
  },
];

const KES = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
});

const ContactFees: React.FC = () => {
  const [fees, setFees] = useState<ContactFee[]>(DEFAULTS);

  const updateFee = <K extends keyof ContactFee>(
    id: ContactFee['id'],
    key: K,
    value: ContactFee[K]
  ) =>
    setFees((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: value } : f))
    );

  const handleSave = () => {
    // TODO: wire to real API
    console.log('Save contact fees →', fees);

    toast.success('💾 Contact fees saved', {
      description: 'New pricing is now live across the platform.',
      style: {
        background: '#1a1a2e',
        border: '2px solid #22c55e',
        color: '#fff',
      },
    });
  };

  const totalRevenuePerReveal = fees
    .filter((f) => f.enabled)
    .reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="sa-contactfees">
      {/* ── Info banner ───────────────────────────────── */}
      <div className="sa-contactfees-banner">
        <div className="sa-contactfees-banner-icon">
          <FiInfo />
        </div>
        <div>
          <h3 className="sa-contactfees-banner-title">
            Contact Access Pricing
          </h3>
          <p className="sa-contactfees-banner-sub">
            These fees are deducted from the provider’s wallet whenever a
            customer unlocks their contact details. Set to{' '}
            <strong>0</strong> to make a channel free.
          </p>
        </div>
      </div>

      {/* ── Fee cards ─────────────────────────────────── */}
      <div className="sa-contactfees-grid">
        {fees.map((fee) => (
          <div
            key={fee.id}
            className={`sa-contactfee-card sa-contactfee-card--${fee.color} ${
              !fee.enabled ? 'is-disabled' : ''
            }`}
          >
            <div className="sa-contactfee-head">
              <div className="sa-contactfee-icon">{fee.icon}</div>

              <label className="sa-addplan-toggle">
                <input
                  type="checkbox"
                  checked={fee.enabled}
                  onChange={(e) =>
                    updateFee(fee.id, 'enabled', e.target.checked)
                  }
                />
                <span className="sa-addplan-toggle-track">
                  <span className="sa-addplan-toggle-thumb" />
                </span>
                <span className="sa-addplan-toggle-label">
                  {fee.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            <h4 className="sa-contactfee-title">{fee.label}</h4>
            <p className="sa-contactfee-desc">{fee.description}</p>

            <div className="sa-contactfee-input-wrap">
              <span className="sa-contactfee-prefix">KES</span>
              <input
                type="number"
                className="sa-contactfee-input"
                value={fee.amount}
                onChange={(e) =>
                  updateFee(
                    fee.id,
                    'amount',
                    Math.max(0, Number(e.target.value))
                  )
                }
                disabled={!fee.enabled}
                min={0}
              />
              <span className="sa-contactfee-suffix">per reveal</span>
            </div>

            <div className="sa-contactfee-preview">
              <FiAlertCircle />
              <span>
                Provider earns{' '}
                <strong>{KES.format(fee.amount)}</strong> less per unlock.
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Summary + Save ────────────────────────────── */}
      <div className="sa-contactfees-footer">
        <div className="sa-contactfees-summary">
          <span className="sa-contactfees-summary-label">
            Max deduction per contact unlock
          </span>
          <span className="sa-contactfees-summary-value">
            {KES.format(totalRevenuePerReveal)}
          </span>
        </div>

        <button
          type="button"
          className="sa-btn sa-btn-primary"
          onClick={handleSave}
        >
          <FiSave />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
};

export default ContactFees;