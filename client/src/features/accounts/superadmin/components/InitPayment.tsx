// src/pages/accounts/components/super/InitPayment.tsx

import { Spinner } from '../../../../components/spinner/Spinner';
import { useInitializeSystemBalance } from '../hooks/useSystemBalance';

import './initPayment.css';

function InitPayment() {
  const {
    mutate: initialize,
    isPending,
    isSuccess,
    isError,
    data,
    error,
    reset,
  } = useInitializeSystemBalance();

  const handleClick = () => {
    if (isPending) return;
    reset();
    initialize();
  };

  const feedback = (() => {
    if (isSuccess && data) {
      const currency = data.data?.currency ?? 'KES';
      const balance = data.data?.balance ?? '0.00';
      return {
        tone: 'success' as const,
        text: data.created
          ? `System balance initialised at ${currency} ${balance}.`
          : `Already initialised — current balance is ${currency} ${balance}.`,
      };
    }
    if (isError && error) {
      return { tone: 'error' as const, text: error.message };
    }
    return null;
  })();

  return (
    <div className="init-payment">
      <div className="init-payment-head">
        <h3 className="init-payment-title">Initialise System Balance</h3>
        <p className="init-payment-sub">
          Creates the system balance row with a default of{' '}
          <strong>KES 0.00</strong> if it doesn't already exist. Safe to run
          multiple times.
        </p>
      </div>

      <button
        type="button"
        className="init-payment-btn"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Spinner size={16} color="#FFFFFF" />
            <span>Initialising…</span>
          </>
        ) : (
          <span>Initialise Payment</span>
        )}
      </button>

      {feedback && (
        <div className={`init-payment-feedback is-${feedback.tone}`}>
          {feedback.text}
        </div>
      )}
    </div>
  );
}

export default InitPayment;