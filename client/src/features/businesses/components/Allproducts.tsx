import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import {
  fetchProducts,
  deleteProduct,
  type Product,
} from '../api/productsApi';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import Editproduct from './Editproduct';
import './allproducts.css';

type AllproductsProps = {
  businessId: number;
  onAdd?: () => void;
};

function Allproducts({ businessId, onAdd }: AllproductsProps) {
  const access = useAuthStore((s) => s.access);
  const toast = useToast();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const {
    data: products = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['business-products', businessId, access],
    queryFn: () => fetchProducts(access, businessId),
    enabled: !!access && !!businessId,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: number) => deleteProduct(access, productId),
    onSuccess: (res) => {
      toast.success(res.message || 'Product deleted.');
      queryClient.invalidateQueries({
        queryKey: ['business-products', businessId],
      });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not delete this product.');
      setDeleteTarget(null);
    },
  });

  // ── Loading ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="apd-state">
        <Spinner size={20} color="#2563EB" label="Loading products…" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────
  if (isError) {
    return (
      <div className="apd-state apd-state-error">
        {(error as Error)?.message || 'Could not load products.'}
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────
  if (products.length === 0) {
    return (
      <div className="apd-shell">
        <div className="apd-empty">
          <p className="apd-empty-title">No products yet</p>
          <p className="apd-empty-sub">
            Your products will show up here.
          </p>
          {onAdd && (
            <button type="button" className="apd-empty-btn" onClick={onAdd}>
              + Add your first product
            </button>
          )}
        </div>

        {onAdd && (
          <button
            type="button"
            className="apd-fab"
            onClick={onAdd}
            aria-label="Add a product"
            title="Add product"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // ── List ──────────────────────────────────────────────
  return (
    <div className="apd-shell">
      <ul className="apd-list">
        {products.map((p) => (
          <li
            key={p.id}
            className={'apd-item' + (editingId === p.id ? ' is-editing' : '')}
          >
            {editingId === p.id ? (
              <Editproduct
                productId={p.id}
                onCancel={() => setEditingId(null)}
                onSaved={() => setEditingId(null)}
              />
            ) : (
              <>
                {/* ── Header: date + actions ───────────── */}
                <div className="apd-item-header">
                  <span className="apd-item-when">
                    {new Date(p.created_at).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>

                  <div className="apd-item-actions">
                    <button
                      type="button"
                      className="apd-icon-btn apd-icon-btn-edit"
                      onClick={() => setEditingId(p.id)}
                      aria-label="Edit product"
                      title="Edit"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                        aria-hidden="true">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="apd-icon-btn apd-icon-btn-danger"
                      onClick={() => setDeleteTarget(p)}
                      aria-label="Delete product"
                      title="Delete"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                        aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* ── Name ─────────────────────────────── */}
                <h4 className="apd-item-title">
                  {p.name || 'Untitled product'}
                </h4>

                {/* ── Image — first visual ─────────────── */}
                {p.image_url && (
                  <div className="apd-item-image">
                    <img src={p.image_url} alt={p.name} loading="lazy" />
                  </div>
                )}

                {/* ── Description — below image ────────── */}
                {p.description && (
                  <p className="apd-item-text">{p.description}</p>
                )}

                {/* ── Properties — optional chips ──────── */}
                {p.properties && p.properties.length > 0 && (
                  <ul className="apd-item-props">
                    {p.properties.map((prop) => (
                      <li key={prop} className="apd-item-prop">
                        {prop}
                      </li>
                    ))}
                  </ul>
                )}

                {/* ── Footer: price + date ─────────────── */}
                <div className="apd-item-footer">
                  {typeof p.price === 'number' && (
                    <span className="apd-item-price">
                      KES {p.price.toLocaleString()}
                    </span>
                  )}
                  {typeof p.price !== 'number' && (
                    <span className="apd-item-price apd-item-price-muted">
                      Price on request
                    </span>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {onAdd && (
        <button
          type="button"
          className="apd-fab"
          onClick={onAdd}
          aria-label="Add a product"
          title="Add product"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.name || 'this product'}"?`}
        message="This action cannot be undone. The product and its Cloudinary image will be permanently removed."
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

export default Allproducts;