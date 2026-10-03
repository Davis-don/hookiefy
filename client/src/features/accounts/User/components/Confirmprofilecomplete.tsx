import './confirmprofilecomplete.css';

type ConfirmprofilecompleteProps = {
  missingLabels: string[];
  completionPercent: number;
  onComplete: () => void;
};

function Confirmprofilecomplete({
  missingLabels,
  completionPercent,
  onComplete,
}: ConfirmprofilecompleteProps) {
  // Ring geometry
  const SIZE = 132;
  const STROKE = 10;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const OFFSET = CIRC - (completionPercent / 100) * CIRC;

  return (
    <div className="ua-confirm">
      {/* Soft radial glow background */}
      <div className="ua-confirm-glow" aria-hidden="true" />

      <div className="ua-confirm-inner">
        {/* ── Progress ring ─────────────────────────────── */}
        <div className="ua-confirm-ring" aria-hidden="true">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="rgba(37, 99, 235, 0.12)"
              strokeWidth={STROKE}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="url(#uaConfirmGradient)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={OFFSET}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              className="ua-confirm-ring-arc"
            />
            <defs>
              <linearGradient id="uaConfirmGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
          </svg>

          <div className="ua-confirm-ring-value">
            <span className="ua-confirm-ring-num">{completionPercent}%</span>
            <span className="ua-confirm-ring-cap">complete</span>
          </div>
        </div>

        {/* ── Copy ──────────────────────────────────────── */}
        <h3 className="ua-confirm-title">
          Almost there — just a few details left
        </h3>

        <p className="ua-confirm-subtitle">
          We need a bit more info before you can start adding services,
          products, and stories. It only takes a minute.
        </p>

        {/* ── Missing fields as chips ───────────────────── */}
        <ul className="ua-confirm-chips">
          {missingLabels.map((label) => (
            <li key={label} className="ua-confirm-chip">
              <span className="ua-confirm-chip-dot" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>

        {/* ── CTA ───────────────────────────────────────── */}
        <button
          type="button"
          className="ua-confirm-cta"
          onClick={onComplete}
        >
          <span>Complete my profile</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>

        <p className="ua-confirm-hint">
          Your progress is saved automatically.
        </p>
      </div>
    </div>
  );
}

export default Confirmprofilecomplete;