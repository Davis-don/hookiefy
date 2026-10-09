// src/components/engagement/FollowButton.tsx
import './followbutton.css';

type FollowButtonProps = {
  businessId: number;
};

function FollowButton({ businessId }: FollowButtonProps) {
  void businessId;

  return (
    <button
      type="button"
      className="follow-button"
      aria-label="Follow"
      title="Follow"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="16" y1="11" x2="22" y2="11" />
      </svg>
    </button>
  );
}

export default FollowButton;