// src/features/perfTests/components/Speedometer.tsx

import { useEffect, useRef, useState } from 'react';

export type SpeedometerProps = {
  value: number;
  label: string;
  display: string;
  unit?: string;
  hint?: string;
  tone?: 'blue' | 'emerald' | 'violet' | 'orange';
  settling?: boolean;
  settleDurationMs?: number;
};

const TONE_COLOURS: Record<NonNullable<SpeedometerProps['tone']>, string> = {
  blue: '#2563EB',
  emerald: '#10B981',
  violet: '#8B5CF6',
  orange: '#F97316',
};

export default function Speedometer({
  value,
  label,
  display,
  unit,
  hint,
  tone = 'blue',
  settling = false,
  settleDurationMs = 800,
}: SpeedometerProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const colour = TONE_COLOURS[tone];

  const [needle, setNeedle] = useState(0);
  const rafRef = useRef(0);
  const lastStableRef = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);

    if (settling) {
      let t = 0;
      const base = lastStableRef.current;
      const loop = () => {
        t += 0.02;
        const wave = (Math.sin(t * 2.2) + 1) / 2;
        const pos = Math.max(
          0,
          Math.min(100, base - 25 + wave * 50),
        );
        setNeedle(pos);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafRef.current);
    }

    const start = performance.now();
    const from = needle;
    const to = clamped;

    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / settleDurationMs);
      const eased = 1 - Math.pow(1 - k, 4);
      const pos = from + (to - from) * eased;
      setNeedle(pos);
      if (k < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        lastStableRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settling, clamped, settleDurationMs]);

  const R = 44;
  const CX = 60;
  const CY = 60;
  const pathD = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
  const HALF_CIRC = Math.PI * R;

  const angleDeg = 180 - (needle / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  const needleLen = R - 6;
  const nx = CX + Math.cos(angleRad) * needleLen;
  const ny = CY - Math.sin(angleRad) * needleLen;
  const fillPct = needle;

  return (
    <div className={'spdm' + (settling ? ' spdm--sweeping' : '')}>
      <svg viewBox="0 0 120 76" className="spdm-svg" role="img">
        <path
          d={pathD}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d={pathD}
          fill="none"
          stroke={colour}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${HALF_CIRC} ${HALF_CIRC}`}
          strokeDashoffset={HALF_CIRC * (1 - fillPct / 100)}
        />
        <line
          x1={CX}
          y1={CY}
          x2={nx}
          y2={ny}
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.9"
        />
        <circle cx={CX} cy={CY} r="4" fill="#0F172A" />
        <circle cx={CX} cy={CY} r="1.6" fill="#FFFFFF" />
      </svg>

      <div className="spdm-center">
        <span
          className={'spdm-value' + (settling ? ' is-sweeping' : '')}
          style={{ color: colour }}
        >
          {display}
        </span>
        {unit && <span className="spdm-unit">{unit}</span>}
      </div>

      <div className="spdm-footer">
        <span className="spdm-label">{label}</span>
        {hint && <span className="spdm-hint">{hint}</span>}
      </div>
    </div>
  );
}