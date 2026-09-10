// Spinner.tsx
import { useEffect, useState } from 'react';
import './spinner.css';

interface SpinnerProps {
  /** Main loading text */
  message?: string;
  /** Text shown after a delay */
  slowMessage?: string;
  /** Delay in ms before showing the slow message */
  slowAfter?: number;
}

function Spinner({
  message = 'Loading',
  slowMessage = 'This is taking longer than expected…',
  slowAfter = 4000,
}: SpinnerProps) {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsSlow(true), slowAfter);
    return () => clearTimeout(t);
  }, [slowAfter]);

  return (
    <div className="spinner-wrap">
      <div className="spinner" />

      <p className="spinner-text">
        {message}
        <span className="spinner-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </p>

      <p className={`spinner-slow ${isSlow ? 'spinner-slow--visible' : ''}`}>
        {slowMessage}
      </p>
    </div>
  );
}

export default Spinner;