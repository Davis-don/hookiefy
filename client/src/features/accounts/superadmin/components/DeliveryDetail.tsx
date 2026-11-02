// src/pages/accounts/Super/components/DeliveryDetail.tsx

import { useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuthStore } from '../../../../store/authStore';
import { Spinner } from '../../../../components/spinner/Spinner';

import {
  fetchAllDeliveryDetail,
  updateAllDeliveryStatus,
  type AccountSummary,
  type DeliveryStatus,
} from '../api/deliveriesAdminApi';

import './deliverydetail.css';

type DeliveryDetailProps = {
  id: string;
};

const NEXT_STATUSES: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending:   ['delivered', 'cancelled', 'failed'],
  delivered: [],
  cancelled: ['pending'],
  failed:    ['pending'],
};

function DeliveryDetail({ id }: DeliveryDetailProps) {
  const access = useAuthStore((s) => s.access);
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-delivery-detail', id, access],
    queryFn: () => fetchAllDeliveryDetail(access, id),
    enabled: !!access,
    staleTime: 30_000,
  });

  const [pendingStatus, setPendingStatus] =
    useState<DeliveryStatus | null>(null);

  const mutation = useMutation({
    mutationFn: (next: DeliveryStatus) =>
      updateAllDeliveryStatus(access, id, { status: next }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['admin-delivery-detail', id],
      });
      qc.invalidateQueries({ queryKey: ['admin-deliveries'] });
      setPendingStatus(null);
    },
  });

  if (isLoading) {
    return (
      <div className="add-state">
        <Spinner size={22} color="#2563EB" label="Loading delivery…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="add-error">
        {(error as Error)?.message || 'Could not load this delivery.'}
      </p>
    );
  }

  const nexts = NEXT_STATUSES[data.status] ?? [];

  return (
    <div className="add-root">
      {/* ── People ─────────────────────────────────── */}
      <div className="add-grid">
        <Section title="Buyer">
          <AccountBlock
            account={data.buyer}
            fallbackEmail={data.client_email}
          />
        </Section>

        {/* `delivered_by` is the account responsible for
            shipping the item. On the default flow that's the
            seller, so we render it as the Seller block. */}
        <Section title="Seller">
          <AccountBlock
            account={data.courier}
            fallbackEmail={
              data.delivered_by_is_youpata_managed
                ? 'Youpata'
                : data.delivered_by_email
            }
          />
        </Section>

        <Section title="Recipient">
          <AccountBlock
            account={data.recipient}
            fallbackEmail={data.delivered_to_email}
          />
        </Section>
      </div>

      {/* ── Product ────────────────────────────────── */}
      <Section title="Product">
        <div className="add-product">
          <div className="add-product-media">
            {data.product_image_url ? (
              <img
                src={data.product_image_url}
                alt={data.product_name ?? 'Product'}
                loading="lazy"
              />
            ) : (
              <span className="add-product-fallback">
                {(data.product_name ?? 'P').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="add-product-body">
            <p className="add-product-name">
              {data.product_name ?? 'Product'}
            </p>
            <p className="add-product-meta">
              ×{data.quantity} · to {data.town}
            </p>
          </div>
        </div>
      </Section>

      {/* ── Payment ────────────────────────────────── */}
      <Section title="Payment">
        <p className="add-kv">
          <span className="add-kv-label">Ref</span>
          <span className="add-kv-value add-mono">
            {data.payment_reference}
          </span>
        </p>
        <p className="add-kv">
          <span className="add-kv-label">Status</span>
          <span className={`add-status add-status--${data.status}`}>
            {data.status}
          </span>
        </p>
        <p className="add-kv">
          <span className="add-kv-label">Town</span>
          <span className="add-kv-value">{data.town}</span>
        </p>
        <p className="add-kv">
          <span className="add-kv-label">Created</span>
          <span className="add-kv-value">
            {new Date(data.created_at).toLocaleString()}
          </span>
        </p>
        {data.delivered_at && (
          <p className="add-kv">
            <span className="add-kv-label">Delivered</span>
            <span className="add-kv-value">
              {new Date(data.delivered_at).toLocaleString()}
            </span>
          </p>
        )}
      </Section>

      {/* ── Status actions (superadmin only) ───────── */}
      {nexts.length > 0 && (
        <Section title="Change status">
          <div className="add-actions">
            {nexts.map((s) => {
              const isBusy =
                mutation.isPending && pendingStatus === s;
              return (
                <button
                  key={s}
                  type="button"
                  className={`add-action add-action--${s}`}
                  disabled={mutation.isPending}
                  onClick={() => {
                    setPendingStatus(s);
                    mutation.mutate(s);
                  }}
                >
                  {isBusy ? 'Saving…' : `Mark ${s}`}
                </button>
              );
            })}
          </div>

          {mutation.isError && (
            <p className="add-error" style={{ marginTop: 10 }}>
              {(mutation.error as Error)?.message ||
                'Could not update status.'}
            </p>
          )}
        </Section>
      )}

      {nexts.length === 0 && (
        <Section title="Change status">
          <p className="add-muted" style={{ margin: 0 }}>
            This delivery is {data.status} — no further status
            changes are allowed.
          </p>
        </Section>
      )}
    </div>
  );
}

/* ── Building blocks ──────────────────────────────────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="add-section">
      <h3 className="add-section-title">{title}</h3>
      {children}
    </div>
  );
}

function AccountBlock({
  account,
  fallbackEmail,
}: {
  account: AccountSummary | null | undefined;
  fallbackEmail: string | null;
}) {
  if (!account) {
    return (
      <p className="add-kv">
        <span className="add-kv-label">—</span>
        <span className="add-kv-value add-muted">
          {fallbackEmail ?? 'Not assigned'}
        </span>
      </p>
    );
  }

  return (
    <>
      <p className="add-kv">
        <span className="add-kv-label">Name</span>
        <span className="add-kv-value">{account.full_name}</span>
      </p>
      <p className="add-kv">
        <span className="add-kv-label">Email</span>
        <span className="add-kv-value">{account.email}</span>
      </p>
      <p className="add-kv">
        <span className="add-kv-label">Phone</span>
        <span className="add-kv-value">
          {account.phone_number ?? '—'}
        </span>
      </p>
      {account.is_youpata_managed && (
        <p className="add-kv">
          <span className="add-kv-label">Managed</span>
          <span className="add-kv-value add-badge">Youpata</span>
        </p>
      )}
    </>
  );
}

export default DeliveryDetail;