// src/pages/accounts/components/OrdersTab.tsx

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuthStore } from '../../../../store/authStore';
import { useToast } from '../../../../components/toast/ToastContext';
import {
  fetchOrders,
  type OrderRow,
} from '../api/orderApi';

import AddOrderWizard from '../components/AddOrderWizard';
import ManualDeliveryModal, {
  type ManualDeliveryOrderInput,
} from './ManualDeliveryModal';

import './orderstab.css';

/* ── Filter constants ───────────────────────────────── */

const STATUS_OPTIONS = [
  { value: '',          label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending',   label: 'Pending' },
  { value: 'failed',    label: 'Failed' },
  { value: 'reversed',  label: 'Reversed' },
  { value: 'invalid',   label: 'Invalid' },
  { value: 'cancelled', label: 'Cancelled' },
];

const GATEWAY_OPTIONS = [
  { value: '',              label: 'All gateways' },
  { value: 'pesapal',       label: 'PesaPal' },
  { value: 'paystack',      label: 'Paystack' },
  { value: 'mpesa',         label: 'M-Pesa' },
  { value: 'manual_cash',   label: 'Manual — Cash' },
  { value: 'manual_cheque', label: 'Manual — Cheque' },
  { value: 'manual_bank',   label: 'Manual — Bank' },
  { value: 'manual_other',  label: 'Manual — Other' },
];

/* ── Helpers ────────────────────────────────────────── */

function isManual(row: OrderRow): boolean {
  return row.merchant_reference.endsWith('.MAN');
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.floor((now - then) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

function OrdersTab() {
  const access = useAuthStore((s) => s.access);
  const toast = useToast();

  const [rows, setRows] = useState<OrderRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [gateway, setGateway] = useState('');
  const [page, setPage] = useState(1);

  const [showWizard, setShowWizard] = useState(false);
  const [deliveryFor, setDeliveryFor] =
    useState<ManualDeliveryOrderInput | null>(null);

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(count / pageSize));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrders(access, {
        page,
        pageSize,
        status,
        gateway,
        search,
      });
      setRows(data.results);
      setCount(data.count);
    } catch (e) {
      setError((e as Error).message);
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [access, page, status, gateway, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, status, gateway]);

  const stats = useMemo(() => {
    const completed = rows.filter((r) => r.status === 'completed').length;
    const pending = rows.filter((r) => r.status === 'pending').length;
    const manual = rows.filter(isManual).length;
    return { completed, pending, manual };
  }, [rows]);

  const handleWizardSaved = () => {
    setShowWizard(false);
    void load();
  };

  const handleDeliverySaved = () => {
    toast.success('Delivery created.');
    setDeliveryFor(null);
    void load();
  };

  const rowToDeliveryInput = (r: OrderRow): ManualDeliveryOrderInput => ({
    merchant_reference: r.merchant_reference,
    product: r.product,
    product_name: r.product_name,
    business: r.business,
    business_name: r.business_name,
    quantity: r.quantity,
    town: r.town,
    email: r.email,
    phone_number: r.phone_number,
  });

  return (
    <div className="orders-tab">
      <header className="orders-tab__header">
        <div>
          <h2 className="orders-tab__title">Orders</h2>
          <p className="orders-tab__subtitle">
            {count} total · {stats.completed} completed on this page ·{' '}
            {stats.pending} pending · {stats.manual} manual
          </p>
        </div>

        <div className="orders-tab__actions">
          <button
            type="button"
            className="orders-tab__btn orders-tab__btn--primary"
            onClick={() => setShowWizard(true)}
          >
            + Add order
          </button>
        </div>
      </header>

      <div className="orders-tab__filters">
        <input
          type="search"
          className="orders-tab__input"
          placeholder="Search reference, email, phone, product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="orders-tab__select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          className="orders-tab__select"
          value={gateway}
          onChange={(e) => setGateway(e.target.value)}
        >
          {GATEWAY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="orders-tab__btn orders-tab__btn--ghost"
          onClick={() => {
            setSearch('');
            setStatus('');
            setGateway('');
            setPage(1);
          }}
        >
          Reset
        </button>
      </div>

      {loading && <div className="orders-tab__state">Loading orders…</div>}

      {!loading && error && (
        <div className="orders-tab__state orders-tab__state--error">
          <p>{error}</p>
          <button
            type="button"
            className="orders-tab__btn"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="orders-tab__state">
          No orders match the current filters.
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="orders-tab__table-wrap">
          <table className="orders-tab__table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Product</th>
                <th>Buyer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Gateway</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="orders-tab__ref">
                      <span className="orders-tab__ref-main">
                        {r.merchant_reference}
                      </span>
                      {isManual(r) && (
                        <span className="orders-tab__chip orders-tab__chip--manual">
                          manual
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="orders-tab__product">
                      <span>{r.product_name ?? '—'}</span>
                      <span className="orders-tab__muted">
                        #{r.product ?? '—'} · qty {r.quantity}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="orders-tab__buyer">
                      <span>{r.email ?? '—'}</span>
                      <span className="orders-tab__muted">
                        {r.phone_number ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td className="orders-tab__amount">{r.amount_display}</td>
                  <td>
                    <span
                      className={
                        'orders-tab__status orders-tab__status--' + r.status
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="orders-tab__gateway">{r.gateway}</td>
                  <td className="orders-tab__muted">
                    {relativeTime(r.created_at)}
                  </td>
                  <td>
                    <div className="orders-tab__row-actions">
                      <button
                        type="button"
                        className="orders-tab__btn orders-tab__btn--ghost"
                        onClick={() => setDeliveryFor(rowToDeliveryInput(r))}
                      >
                        Add delivery
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && pageCount > 1 && (
        <nav className="orders-tab__pagination" aria-label="Pagination">
          <button
            type="button"
            className="orders-tab__btn orders-tab__btn--ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </button>
          <span className="orders-tab__muted">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            className="orders-tab__btn orders-tab__btn--ghost"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Next →
          </button>
        </nav>
      )}

      {showWizard && (
        <AddOrderWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => {
            /* The wizard saves the payment; the list refresh
               happens when the user closes or moves into the
               delivery flow. Keeping this a no-op means we
               don't unmount the wizard before step 5 renders. */
          }}
          onSaved={handleWizardSaved}
          onRequestDelivery={(order) => setDeliveryFor(order)}
        />
      )}

      {deliveryFor && (
        <ManualDeliveryModal
          order={deliveryFor}
          onClose={() => setDeliveryFor(null)}
          onSaved={handleDeliverySaved}
        />
      )}
    </div>
  );
}

export default OrdersTab;