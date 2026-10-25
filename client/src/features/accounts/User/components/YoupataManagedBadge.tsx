// src/pages/Home/feed/YoupataManagedBadge.tsx

import './youpataBadge.css';

type Props = {
  /** Visual scale — 'sm' inside cards, 'md' inside details. */
  size?: 'sm' | 'md';
  /** Optional label override. Defaults to "Youpata Managed". */
  label?: string;
};

function YoupataManagedBadge({ size = 'sm', label = 'Youpata Managed' }: Props) {
  return (
    <span
      className={`youpata-badge youpata-badge-${size}`}
      title="This item is managed directly by Youpata"
    >
      <svg
        width={size === 'md' ? 14 : 12}
        height={size === 'md' ? 14 : 12}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span className="youpata-badge-label">{label}</span>
    </span>
  );
}

export default YoupataManagedBadge;