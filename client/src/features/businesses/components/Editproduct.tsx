import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import {
  fetchProduct,
  updateProduct,
  type ProductPayload,
} from '../api/productsApi';
import './editproduct.css';

type EditproductProps = {
  productId: number;
  onCancel: () => void;
  onSaved: () => void;
};

type FormState = {
  name: string;
  description: string;
  price: string;
  imageFile: File | null;
};

const MAX_PROPERTIES = 5;

function Editproduct({ productId, onCancel, onSaved }: EditproductProps) {
  const toast = useToast();
  const access = useAuthStore((s) => s.access);
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    price: '',
    imageFile: null,
  });

  // Properties — start empty, fill once loaded
  const [properties, setProperties] = useState<string[]>(['']);
  const [error, setError] = useState<string>('');
  const [hydrated, setHydrated] = useState(false);

  const {
    data: product,
    isLoading,
    isError,
    error: loadError,
  } = useQuery({
    queryKey: ['product', productId, access],
    queryFn: () => fetchProduct(access, productId),
    enabled: !!access && !!productId,
    staleTime: 30_000,
  });

  // Prefill once loaded
  useEffect(() => {
    if (product && !hydrated) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        price:
          product.price !== null && product.price !== undefined
            ? String(product.price)
            : '',
        imageFile: null,
      });

      // Rebuild the property list from the filled ones.
      const existing = [
        product.property1,
        product.property2,
        product.property3,
        product.property4,
        product.property5,
      ]
        .filter((p): p is string => typeof p === 'string' && p.trim() !== '');

      setProperties(existing.length > 0 ? existing : ['']);
      setHydrated(true);
    }
  }, [product, hydrated]);

  const previewUrl = useMemo(() => {
    if (form.imageFile) return URL.createObjectURL(form.imageFile);
    return product?.image_url ?? null;
  }, [form.imageFile, product?.image_url]);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  // ── Property helpers ─────────────────────────────────
  const addProperty = () => {
    setProperties((prev) =>
      prev.length >= MAX_PROPERTIES ? prev : [...prev, '']
    );
  };

  const updateProperty = (index: number, value: string) => {
    setProperties((prev) =>
      prev.map((p, i) => (i === index ? value : p))
    );
  };

  const removeProperty = (index: number) => {
    setProperties((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [''] : next;
    });
  };

  const mutation = useMutation({
    mutationFn: (payload: ProductPayload) =>
      updateProduct(access, productId, payload),

    onSuccess: (res) => {
      toast.success(res.message || 'Product updated.');
      queryClient.invalidateQueries({ queryKey: ['business-products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      onSaved();
    },

    onError: (err: any) => {
      toast.error(err?.message || 'Could not update this product.');
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Please choose a JPG, PNG, WEBP or GIF image.');
      e.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be under 8 MB.');
      e.target.value = '';
      return;
    }

    setForm((prev) => ({ ...prev, imageFile: file }));
    setError('');
  };

  const clearNewImage = () => {
    setForm((prev) => ({ ...prev, imageFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Please add a product name.');

    let parsedPrice: number | null = null;
    if (form.price.trim()) {
      const n = Number(form.price);
      if (Number.isNaN(n) || n < 0) {
        return setError('Price must be a positive number.');
      }
      parsedPrice = n;
    }

    const cleaned = properties.map((p) => p.trim());

    mutation.mutate({
      name: form.name.trim(),
      description: form.description.trim(),
      price: parsedPrice,
      property1: cleaned[0] || undefined,
      property2: cleaned[1] || undefined,
      property3: cleaned[2] || undefined,
      property4: cleaned[3] || undefined,
      property5: cleaned[4] || undefined,
      imageFile: form.imageFile,
    });
  };

  // ── States ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="epr-state">
        <Spinner size={20} color="#2563EB" label="Loading product…" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="epr-state epr-state-error">
        {(loadError as Error)?.message || 'Could not load this product.'}
      </div>
    );
  }

  const busy = mutation.isPending;
  const canAddProperty = properties.length < MAX_PROPERTIES;

  return (
    <form className="epr-editor" onSubmit={handleSubmit} noValidate>

      {/* ── 1. Image — first thing you see ───────────── */}
      <div className="epr-editor-image">
        {previewUrl ? (
          <div className="epr-editor-image-frame">
            <img
              src={previewUrl}
              alt="Product"
              className="epr-editor-image-img"
            />
            <label
              htmlFor="epr-image"
              className="epr-editor-image-overlay"
              aria-label="Replace image"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span>Replace image</span>
            </label>
          </div>
        ) : (
          <label htmlFor="epr-image" className="epr-editor-image-empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>Choose an image</span>
          </label>
        )}

        {form.imageFile && (
          <div className="epr-editor-image-note">
            <span className="epr-editor-image-note-dot" aria-hidden="true" />
            <span className="epr-editor-image-note-text">
              New image ready — replaces the current one on save
            </span>
            <button
              type="button"
              className="epr-editor-image-undo"
              onClick={clearNewImage}
              disabled={busy}
            >
              Undo
            </button>
          </div>
        )}

        <input
          id="epr-image"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageChange}
          disabled={busy}
          className="epr-file-hidden"
        />
      </div>

      {/* ── 2. Name ──────────────────────────────────── */}
      <div className="epr-editor-field">
        <label className="epr-editor-label" htmlFor="epr-name">
          Product name
        </label>
        <input
          id="epr-name"
          type="text"
          className="epr-editor-title"
          placeholder="Give your product a name"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          maxLength={200}
          disabled={busy}
        />
        <span className="epr-editor-counter">{form.name.length} / 200</span>
      </div>

      {/* ── 3. Description ───────────────────────────── */}
      <div className="epr-editor-field">
        <label className="epr-editor-label" htmlFor="epr-desc">
          Description
        </label>
        <textarea
          id="epr-desc"
          className="epr-editor-body"
          placeholder="What is it? Who is it for?"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          maxLength={1000}
          disabled={busy}
        />
        <span className="epr-editor-counter">
          {form.description.length} / 1000
        </span>
      </div>

      {/* ── 4. Price ─────────────────────────────────── */}
      <div className="epr-editor-field">
        <label className="epr-editor-label" htmlFor="epr-price">
          Price (KES)
        </label>
        <input
          id="epr-price"
          type="number"
          className="epr-editor-price"
          placeholder="e.g. 1500"
          value={form.price}
          onChange={(e) => update('price', e.target.value)}
          min={0}
          step="1"
          disabled={busy}
        />
      </div>

      {/* ── 5. Properties ────────────────────────────── */}
      <div className="epr-editor-field">
        <label className="epr-editor-label">
          Properties
        </label>
        <p className="epr-editor-help">
          Extra details like Size, Colour, Material. Up to {MAX_PROPERTIES}.
        </p>

        <div className="epr-props">
          {properties.map((value, index) => (
            <div className="epr-prop-row" key={index}>
              <span className="epr-prop-index">{index + 1}</span>

              <input
                type="text"
                className="epr-prop-input"
                placeholder={`Property ${index + 1}`}
                value={value}
                onChange={(e) => updateProperty(index, e.target.value)}
                maxLength={200}
                disabled={busy}
              />

              {properties.length > 1 && (
                <button
                  type="button"
                  className="epr-prop-remove"
                  onClick={() => removeProperty(index)}
                  disabled={busy}
                  aria-label={`Remove property ${index + 1}`}
                  title="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.6"
                    strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {canAddProperty && (
          <button
            type="button"
            className="epr-prop-add"
            onClick={addProperty}
            disabled={busy}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add another property</span>
          </button>
        )}

        {!canAddProperty && (
          <p className="epr-editor-help">
            Maximum of {MAX_PROPERTIES} properties reached.
          </p>
        )}
      </div>

      {/* ── Error ────────────────────────────────────── */}
      {error && (
        <div className="epr-editor-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="13" />
            <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────── */}
      <div className="epr-editor-actions">
        <button
          type="button"
          className="epr-editor-btn epr-editor-btn-ghost"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="epr-editor-btn epr-editor-btn-primary"
          disabled={busy}
        >
          {busy ? <Spinner size={16} label="Saving…" /> : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

export default Editproduct;