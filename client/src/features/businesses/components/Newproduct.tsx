import { useState, useRef, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import { createProduct, type ProductPayload } from '../api/productsApi';
import './newproduct.css';

type NewproductProps = {
  businessId: number;
  businessName?: string;
  onBack?: () => void;
  onCreated?: () => void;
};

type FormState = {
  name: string;
  description: string;
  price: string;
  imageFile: File | null;
};

const initialState: FormState = {
  name: '',
  description: '',
  price: '',
  imageFile: null,
};

/** Maximum number of optional property slots. */
const MAX_PROPERTIES = 5;

function Newproduct({
  businessId,
  businessName,
  onBack,
  onCreated,
}: NewproductProps) {
  const toast = useToast();
  const access = useAuthStore((s) => s.access);
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string>('');

  // Properties start with ONE empty slot and grow as the user
  // clicks the little plus beneath the last one.
  const [properties, setProperties] = useState<string[]>(['']);

  const previewUrl = useMemo(() => {
    if (!form.imageFile) return null;
    return URL.createObjectURL(form.imageFile);
  }, [form.imageFile]);

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
      createProduct(access, businessId, payload),

    onSuccess: (res) => {
      toast.success(res.message || 'Product created.');
      queryClient.invalidateQueries({
        queryKey: ['business-products', businessId],
      });
      setForm(initialState);
      setProperties(['']);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onCreated?.();
    },

    onError: (err: any) => {
      toast.error(err?.message || 'Could not create the product.');
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

  const clearImage = () => {
    setForm((prev) => ({ ...prev, imageFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Please add a product name.');
    if (!form.imageFile) return setError('Please attach an image.');

    // Parse price: allow empty, but reject NaN
    let parsedPrice: number | null = null;
    if (form.price.trim()) {
      const n = Number(form.price);
      if (Number.isNaN(n) || n < 0) {
        return setError('Price must be a positive number.');
      }
      parsedPrice = n;
    }

    // Trim properties, drop empties
    const cleanedProperties = properties.map((p) => p.trim());

    mutation.mutate({
      name: form.name.trim(),
      description: form.description.trim(),
      price: parsedPrice,
      property1: cleanedProperties[0] || undefined,
      property2: cleanedProperties[1] || undefined,
      property3: cleanedProperties[2] || undefined,
      property4: cleanedProperties[3] || undefined,
      property5: cleanedProperties[4] || undefined,
      imageFile: form.imageFile,
    });
  };

  const busy = mutation.isPending;
  const canAddProperty = properties.length < MAX_PROPERTIES;

  return (
    <div className="npr-shell">
      {/* ── Top bar with back ──────────────────────── */}
      {onBack && (
        <div className="npr-topbar">
          <button
            type="button"
            className="npr-icon-btn npr-icon-btn-back"
            onClick={onBack}
            aria-label="Back"
            title="Back"
            disabled={busy}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────── */}
      <div className="npr-header">
        <h2 className="npr-title">Add a product</h2>
        <p className="npr-sub">
          List a product for{' '}
          {businessName || 'this business'}.
        </p>
      </div>

      {/* ── Form ───────────────────────────────────── */}
      <form className="npr-form" onSubmit={handleSubmit} noValidate>
        {/* Name */}
        <div className="npr-field">
          <label className="npr-label" htmlFor="npr-name">Product name</label>
          <input
            id="npr-name"
            type="text"
            className="npr-input"
            placeholder="e.g. Blue cotton t-shirt"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            maxLength={200}
            disabled={busy}
          />
          <span className="npr-counter">{form.name.length} / 200</span>
        </div>

        {/* Description */}
        <div className="npr-field">
          <label className="npr-label" htmlFor="npr-desc">
            Description <span className="npr-hint">(optional)</span>
          </label>
          <textarea
            id="npr-desc"
            className="npr-input npr-textarea"
            placeholder="What is it? Who is it for?"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={4}
            maxLength={1000}
            disabled={busy}
          />
          <span className="npr-counter">{form.description.length} / 1000</span>
        </div>

        {/* Price */}
        <div className="npr-field">
          <label className="npr-label" htmlFor="npr-price">
            Price (KES) <span className="npr-hint">(optional)</span>
          </label>
          <input
            id="npr-price"
            type="number"
            className="npr-input"
            placeholder="e.g. 1500"
            value={form.price}
            onChange={(e) => update('price', e.target.value)}
            min={0}
            step="1"
            disabled={busy}
          />
        </div>

        {/* Properties — unfoldable list */}
        <div className="npr-field">
          <label className="npr-label">
            Properties <span className="npr-hint">(optional)</span>
          </label>
          <p className="npr-help">
            Add extra details like Size, Colour, Material. Up to{' '}
            {MAX_PROPERTIES}.
          </p>

          <div className="npr-props">
            {properties.map((value, index) => (
              <div className="npr-prop-row" key={index}>
                <span className="npr-prop-index">{index + 1}</span>

                <input
                  type="text"
                  className="npr-input npr-prop-input"
                  placeholder={`Property ${index + 1}`}
                  value={value}
                  onChange={(e) => updateProperty(index, e.target.value)}
                  maxLength={200}
                  disabled={busy}
                />

                {properties.length > 1 && (
                  <button
                    type="button"
                    className="npr-prop-remove"
                    onClick={() => removeProperty(index)}
                    disabled={busy}
                    aria-label={`Remove property ${index + 1}`}
                    title="Remove"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.4"
                      strokeLinecap="round" strokeLinejoin="round"
                      aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* The little plus that adds one more field */}
          {canAddProperty && (
            <button
              type="button"
              className="npr-prop-add"
              onClick={addProperty}
              disabled={busy}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add another property</span>
            </button>
          )}

          {!canAddProperty && (
            <p className="npr-help">
              Maximum of {MAX_PROPERTIES} properties reached.
            </p>
          )}
        </div>

        {/* Image upload — required */}
        <div className="npr-field">
          <label className="npr-label" htmlFor="npr-image">
            Image <span className="npr-required">*</span>
          </label>

          {!form.imageFile ? (
            <div className="npr-upload">
              <input
                id="npr-image"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                disabled={busy}
                className="npr-upload-input"
              />
              <span className="npr-upload-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </span>
              <span className="npr-upload-text">
                Click to choose an image
              </span>
              <span className="npr-upload-sub">
                JPG, PNG, WEBP or GIF · up to 8 MB
              </span>
            </div>
          ) : (
            <div className="npr-preview">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Selected"
                  className="npr-preview-img"
                />
              )}
              <div className="npr-preview-meta">
                <span className="npr-preview-name">
                  {form.imageFile.name}
                </span>
                <span className="npr-preview-size">
                  {(form.imageFile.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  className="npr-preview-remove"
                  onClick={clearImage}
                  disabled={busy}
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <p className="npr-error">{error}</p>}

        {/* Actions */}
        <div className="npr-actions">
          {onBack && (
            <button
              type="button"
              className="npr-btn npr-btn-ghost"
              onClick={onBack}
              disabled={busy}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="npr-btn npr-btn-primary"
            disabled={busy}
          >
            {busy
              ? <Spinner size={18} label="Saving…" />
              : 'Save product'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Newproduct;