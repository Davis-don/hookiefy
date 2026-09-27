// components/plans/PlanCard.tsx
import { FiCheck, FiStar, FiZap, FiEye, FiBarChart2 } from 'react-icons/fi';
import './plancard.css';

/* ─────────── Types ─────────── */

export interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  services_limit: number | null;
  images_per_service: number | null;
  stories_per_month: number | null;
  profile_images_limit: number;
  featured_listing: boolean;
  verified_premium_badge: boolean;
  priority_visibility: boolean;
  analytics_level: 'basic' | 'advanced';
  connection_fee_type: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface PlanCardProps {
  plan: Plan;
  isCurrent?: boolean;
  isPopular?: boolean;
  /** Override the button text. Falls back to defaults if unset. */
  ctaLabel?: string;
  /** Disable the button (e.g. current plan or downgrade-blocked). */
  ctaDisabled?: boolean;
  onUpgrade?: (plan: Plan) => void;
}

/* ─────────── Helpers ─────────── */

function formatPrice(price: string): string {
  const n = Number(price);
  if (Number.isNaN(n) || n === 0) return 'Free';
  return `KES ${n.toLocaleString()}`;
}

function limitLabel(v: number | null): string {
  if (v === null || v === undefined) return 'Unlimited';
  return String(v);
}

/* ─────────── Component ─────────── */

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrent = false,
  isPopular = false,
  ctaLabel,
  ctaDisabled = false,
  onUpgrade,
}) => {
  const priceLabel = formatPrice(plan.price);
  const isFree = Number(plan.price) === 0;

  const features: { icon: React.ReactNode; text: string }[] = [
    {
      icon: <FiCheck />,
      text: `${limitLabel(plan.services_limit)} services`,
    },
    {
      icon: <FiCheck />,
      text: `${limitLabel(plan.images_per_service)} images per service`,
    },
    {
      icon: <FiCheck />,
      text: `${limitLabel(plan.stories_per_month)} stories / month`,
    },
  ];

  if (plan.featured_listing) {
    features.push({
      icon: <FiStar />,
      text: 'Featured listings',
    });
  }

  if (plan.verified_premium_badge) {
    features.push({
      icon: <FiCheck />,
      text: 'Verified premium badge',
    });
  }

  if (plan.priority_visibility) {
    features.push({
      icon: <FiZap />,
      text: 'Priority visibility',
    });
  }

  if (plan.analytics_level === 'advanced') {
    features.push({
      icon: <FiBarChart2 />,
      text: 'Advanced analytics',
    });
  }

  if (!plan.featured_listing && !plan.priority_visibility) {
    features.push({
      icon: <FiEye />,
      text: 'Standard visibility',
    });
  }

  /* ── Decide the CTA label + disabled state ── */
  const label =
    ctaLabel ??
    (isCurrent
      ? 'Current Plan'
      : isFree
      ? 'Get Started'
      : 'Upgrade');

  const disabled = ctaDisabled || isCurrent;

  const handleClick = () => {
    if (disabled) return;
    onUpgrade?.(plan);
  };

  return (
    <article
      className={`plan-card ${
        isCurrent ? 'plan-card--current' : ''
      } ${isPopular ? 'plan-card--popular' : ''}`}
    >
      {isPopular && (
        <span className="plan-card-ribbon">Most Popular</span>
      )}

      {isCurrent && (
        <span className="plan-card-current-badge">
          <FiCheck /> Current Plan
        </span>
      )}

      <header className="plan-card-header">
        <h3 className="plan-card-name">{plan.name}</h3>
        {plan.description && (
          <p className="plan-card-description">{plan.description}</p>
        )}
      </header>

      <div className="plan-card-price-block">
        <span className="plan-card-price">{priceLabel}</span>
        {!isFree && (
          <span className="plan-card-price-suffix">/ month</span>
        )}
      </div>

      <ul className="plan-card-features">
        {features.map((f, i) => (
          <li key={i} className="plan-card-feature">
            <span className="plan-card-feature-icon">{f.icon}</span>
            <span className="plan-card-feature-text">{f.text}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`plan-card-cta ${
          disabled ? 'plan-card-cta--current' : ''
        }`}
        onClick={handleClick}
        disabled={disabled}
      >
        {label}
      </button>
    </article>
  );
};

export default PlanCard;