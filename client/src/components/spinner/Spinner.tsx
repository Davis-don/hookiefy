import './spinner.css';

type SpinnerProps = {
  size?: number;
  color?: string;
  label?: string;
};

export function Spinner({ size = 20, color, label }: SpinnerProps) {
  return (
    <div className="yp-spinner" role="status" aria-live="polite">
      <span
        className="yp-spinner-ring"
        style={{
          width: size,
          height: size,
          borderTopColor: color ?? '#FFFFFF',
        }}
      />
      {label && <span className="yp-spinner-label">{label}</span>}
    </div>
  );
}