// src/features/accounts/User/components/DeliveriesList.tsx

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../../store/authStore';
import { Spinner } from '../../../../components/spinner/Spinner';

import {
  fetchMyDeliveries,
  type Delivery,
  type DeliveryStatus,
} from '../api/deliveriesApi';

import './deliveriesList.css';

type StatusFilter = 'all' | DeliveryStatus;

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

function DeliveriesList() {
  const access = useAuthStore((s) => s.access);

  const [filter, setFilter] = useState<StatusFilter>('all');

  const {
    data: deliveries = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['deliveries', 'mine', filter, access],
    queryFn: () =>
      fetchMyDeliveries(access, {
        status: filter === 'all' ? undefined : filter,
      }),
    enabled: !!access,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="dlv-state dlv-state--center">
        <Spinner
          size={22}
          color="#2563EB"
          label="Loading deliveries…"
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="dlv-state dlv-state--center dlv-state--error">
        <p>
          {(error as Error)?.message ||
            'Could not load deliveries.'}
        </p>
      </div>
    );
  }

  return (
    <div className="dlv-list">
      {/* Filter tabs */}
      <nav className="dlv-tabs" aria-label="Delivery filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={
              'dlv-tab' + (filter === f.key ? ' is-active' : '')
            }
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            {f.label}
          </button>
        ))}
      </nav>

      {/* Empty */}
      {deliveries.length === 0 && (
        <div className="dlv-state">
          <div className="dlv-empty">
            <div className="dlv-empty-icon" aria-hidden="true">
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7l9-4 9 4" />
                <path d="M3 7v10l9 4 9-4V7" />
                <path d="M12 21V11" />
              </svg>
            </div>
            <p className="dlv-empty-title">
              {filter === 'all'
                ? 'No deliveries yet'
                : `No ${filter} deliveries`}
            </p>
            <p className="dlv-empty-sub">
              {filter === 'all'
                ? 'When you buy a product, its delivery will appear here.'
                : 'Try a different tab to see your other deliveries.'}
            </p>
          </div>
        </div>
      )}

      {/* Cards */}
      {deliveries.length > 0 && (
        <ul className="dlv-cards">
          {deliveries.map((delivery) => (
            <li key={delivery.id}>
              <DeliveryCard delivery={delivery} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============================================================
   CARD — clean bordered row, Jumia-style
   ============================================================ */

type DeliveryCardProps = {
  delivery: Delivery;
};

function DeliveryCard({ delivery }: DeliveryCardProps) {
  return (
    <article className="dlv-card">
      {/* Top row: image + main info + status pill */}
      <div className="dlv-card-row">
        <div className="dlv-card-media">
          {delivery.product_image_url ? (
            <img
              src={delivery.product_image_url}
              alt={delivery.product_name ?? 'Product'}
              loading="lazy"
            />
          ) : (
            <span className="dlv-card-media-fallback">
              {(delivery.product_name ?? 'P').charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="dlv-card-body">
          <p className="dlv-card-title">
            {delivery.product_name ?? 'Product'}
          </p>
          <p className="dlv-card-sub">
            {delivery.town} · ×{delivery.quantity}
          </p>
          <p className="dlv-card-sub">
            {delivery.time_since_created} ago
          </p>
        </div>

        <span className={`dlv-status dlv-status--${delivery.status}`}>
          {delivery.status}
        </span>
      </div>

      {/* Bottom meta rows */}
      <div className="dlv-card-foot">
        <p className="dlv-card-meta">
          <span className="dlv-card-meta-label">Ref</span>
          <span className="dlv-mono">{delivery.payment_reference}</span>
        </p>

        {delivery.delivered_by_email && (
          <p className="dlv-card-meta">
            <span className="dlv-card-meta-label">Courier</span>
            <span>{delivery.delivered_by_email}</span>
          </p>
        )}
      </div>
    </article>
  );
}

export default DeliveriesList;