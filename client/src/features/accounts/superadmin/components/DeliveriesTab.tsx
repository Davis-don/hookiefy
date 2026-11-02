// src/pages/accounts/Super/components/DeliveriesTab.tsx

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../../store/authStore';
import { Spinner } from '../../../../components/spinner/Spinner';

import {
  fetchAllDeliveries,
  type AdminDelivery,
  type DeliveryStatus,
} from '../api/deliveriesAdminApi';

import DeliveryDetail from './DeliveryDetail';

import './deliveriestab.css';

type StatusFilter = 'all' | DeliveryStatus;

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'failed',    label: 'Failed' },
];

/* ── Main tab ─────────────────────────────────────────── */

function DeliveriesTab() {
  const access = useAuthStore((s) => s.access);

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['admin-deliveries', filter, access],
    queryFn: ({ pageParam }) =>
      fetchAllDeliveries(access, {
        status: filter === 'all' ? undefined : filter,
        limit: 10,
        before: pageParam ?? undefined,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) =>
      last.has_more ? last.next_cursor : undefined,
    enabled: !!access,
    staleTime: 15_000,
  });

  const allDeliveries: AdminDelivery[] =
    data?.pages.flatMap((p) => p.results) ?? [];

  const deliveries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allDeliveries;
    return allDeliveries.filter((d) => {
      const haystack = [
        d.payment_reference,
        d.id,
        d.product_name ?? '',
        d.town,
        d.client_email,
        d.client_name,
        d.delivered_by_email ?? '',
        d.delivered_to_email ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [allDeliveries, search]);

  if (isLoading) {
    return (
      <div className="sa-tab">
        <h1 className="sa-tab-title">Deliveries</h1>
        <div className="adl-state">
          <Spinner size={22} color="#2563EB" label="Loading deliveries…" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="sa-tab">
        <h1 className="sa-tab-title">Deliveries</h1>
        <p className="adl-error">
          {(error as Error)?.message || 'Could not load deliveries.'}
        </p>
      </div>
    );
  }

  return (
    <section className="sa-tab">
      <h1 className="sa-tab-title">Deliveries</h1>
      <p className="sa-tab-text">
        Every delivery on the platform. Search by payment reference,
        product, town, or account email. Click a row for full details.
      </p>

      {/* Search */}
      <div className="adl-search">
        <span className="adl-search-icon" aria-hidden="true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </span>
        <input
          type="search"
          className="adl-search-input"
          placeholder="Search by payment reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search deliveries"
        />
        {search && (
          <button
            type="button"
            className="adl-search-clear"
            onClick={() => setSearch('')}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Filters */}
      <nav className="adl-tabs" aria-label="Delivery filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={
              'adl-tab' + (filter === f.key ? ' is-active' : '')
            }
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            {f.label}
          </button>
        ))}
      </nav>

      {deliveries.length === 0 && (
        <p className="adl-empty">
          {search
            ? `No deliveries match “${search}”.`
            : 'No deliveries in this view.'}
        </p>
      )}

      {deliveries.length > 0 && (
        <div className="adl-table-wrap">
          <table className="adl-table">
            <thead>
              <tr>
                <th scope="col">Payment Ref</th>
                <th scope="col">Product</th>
                <th scope="col">Buyer</th>
                <th scope="col">Town</th>
                <th scope="col">Qty</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
                <th scope="col" aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr
                  key={d.id}
                  className="adl-tr"
                  onClick={() => setOpenId(d.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpenId(d.id);
                    }
                  }}
                >
                  <td className="adl-td adl-mono">
                    {d.payment_reference}
                  </td>
                  <td className="adl-td adl-td-product">
                    {d.product_name ?? 'Product'}
                  </td>
                  <td className="adl-td adl-td-email">
                    {d.client_email}
                  </td>
                  <td className="adl-td">{d.town}</td>
                  <td className="adl-td adl-td-qty">×{d.quantity}</td>
                  <td className="adl-td">
                    <span
                      className={`adl-status adl-status--${d.status}`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="adl-td adl-td-time">
                    {d.time_since_created} ago
                  </td>
                  <td className="adl-td adl-td-chevron" aria-hidden="true">
                    ▸
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasNextPage && !search && (
        <div className="adl-more">
          <button
            type="button"
            className="adl-more-btn"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {hasNextPage && search && (
        <p className="adl-search-note">
          Showing matches from the loaded page. Clear search and
          click "Load more" to search older deliveries.
        </p>
      )}

      {/* Modal — delegates everything to <DeliveryDetail /> */}
      {openId && (
        <DetailModal id={openId} onClose={() => setOpenId(null)} />
      )}
    </section>
  );
}

/* ── Modal shell only ─────────────────────────────────── */

function DetailModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div
      className="adl-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Delivery details"
    >
      <div
        className="adl-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="adl-modal-head">
          <h2 className="adl-modal-title">Delivery details</h2>
          <button
            type="button"
            className="adl-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="adl-modal-body">
          <DeliveryDetail id={id} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default DeliveriesTab;