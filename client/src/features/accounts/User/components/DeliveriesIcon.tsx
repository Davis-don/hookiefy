// src/features/accounts/User/components/DeliveriesIcon.tsx

type DeliveriesIconProps = {
  /** Optional size override. Defaults to 24 (sidebar / nav). */
  size?: number;
};

function DeliveriesIcon({ size = 24 }: DeliveriesIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Box body — the package */}
      <path d="M3 7l9-4 9 4" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 21V11" />

      {/* Front seam — the fold lines of the box */}
      <path d="M3 7l9 4" />
      <path d="M21 7l-9 4" />

      {/* Motion lines — reads as "shipping" rather than "a box" */}
      <line x1="5" y1="22" x2="9" y2="22" />
      <line x1="10" y1="22" x2="14" y2="22" opacity="0.55" />
      <line x1="15" y1="22" x2="19" y2="22" opacity="0.3" />
    </svg>
  );
}

export default DeliveriesIcon;