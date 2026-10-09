// src/features/businesses/pages/Newproduct.tsx

import { useState, useRef, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import {
  createProduct,
  type ProductPayload,
  type ProductProperty,
} from '../api/productsApi';
import './newproduct.css';

// ============================================================
// TYPES
// ============================================================

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
};

/** A single editable property row (name + value). */
type EditableProperty = {
  id: string;         // local React key only — never sent
  name: string;
  value: string;
};

const initialState: FormState = {
  name: '',
  description: '',
  price: '',
};

/** Allowed image mime types. */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/** Max size per image (8 MB). */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Soft cap so the grid doesn't get silly. Bump or remove freely. */
const MAX_IMAGES = 20;

// Unique key generator for property rows
let propertyKeyCounter = 0;
const nextPropertyKey = () => `prop-${++propertyKeyCounter}`;

const makeEmptyProperty = (): EditableProperty => ({
  id: nextPropertyKey(),
  name: '',
  value: '',
});

// ============================================================
// COMPONENT
// ============================================================

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

  // ── Images: array of File objects ────────────────────
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  // ── Properties: unlimited list of {name, value} ──────
  const [properties, setProperties] = useState<EditableProperty[]>([
    makeEmptyProperty(),
  ]);

  // Preview URLs derived from selected files
  const previewUrls = useMemo(
    () => imageFiles.map((f) => URL.createObjectURL(f)),
    [imageFiles]
  );

  // ── Field updates ────────────────────────────────────
  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  // ── Images ───────────────────────────────────────────
  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;

    const accepted: File[] = [];
    let firstError = '';

    for (const file of picked) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        if (!firstError) firstError = `"${file.name}" is not a JPG, PNG, WEBP or GIF.`;
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        if (!firstError) firstError = `"${file.name}" is larger than 8 MB.`;
        continue;
      }
      accepted.push(file);
    }

    setImageFiles((prev) => {
      const combined = [...prev, ...accepted];
      return combined.slice(0, MAX_IMAGES);
    });

    // Allow re-selecting the same file later
    e.target.value = '';
    setError(firstError);
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Properties ───────────────────────────────────────
  const addProperty = () => {
    setProperties((prev) => [...prev, makeEmptyProperty()]);
  };

  const updateProperty = (
    index: number,
    field: 'name' | 'value',
    value: string
  ) => {
    setProperties((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const removeProperty = (index: number) => {
    setProperties((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [makeEmptyProperty()] : next;
    });
  };

  // ── Mutation ─────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (payload: ProductPayload) =>
      createProduct(access, businessId, payload),

    onSuccess: (res) => {
      toast.success(res.message || 'Product created.');
      queryClient.invalidateQueries({
        queryKey: ['business-products', businessId],
      });

      // Reset
      setForm(initialState);
      setImageFiles([]);
      setProperties([makeEmptyProperty()]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      onCreated?.();
    },

    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Could not create the product.';
      toast.error(message);
    },
  });

  // ── Submit ───────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Please add a product name.');
    if (imageFiles.length === 0) {
      return setError('Please attach at least one image.');
    }

    // Parse price: allow empty, reject NaN / negative
    let parsedPrice: number | null = null;
    if (form.price.trim()) {
      const n = Number(form.price);
      if (Number.isNaN(n) || n < 0) {
        return setError('Price must be a positive number.');
      }
      parsedPrice = n;
    }

    // Keep only properties that have both name and value filled
    const cleanedProperties: ProductProperty[] = properties
      .map((p) => ({ name: p.name.trim(), value: p.value.trim() }))
      .filter((p) => p.name && p.value);

    mutation.mutate({
      name: form.name.trim(),
      description: form.description.trim(),
      price: parsedPrice,
      properties: cleanedProperties,
      imageFiles,
    });
  };

  const busy = mutation.isPending;
  const canAddMoreImages = imageFiles.length < MAX_IMAGES;

  // ============================================================
  // RENDER
  // ============================================================

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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────── */}
      <div className="npr-header">
        <h2 className="npr-title">Add a product</h2>
        <p className="npr-sub">
          List a product for {businessName || 'this business'}.
        </p>
      </div>

      {/* ── Form ───────────────────────────────────── */}
      <form className="npr-form" onSubmit={handleSubmit} noValidate>
        {/* Name */}
        <div className="npr-field">
          <label className="npr-label" htmlFor="npr-name">
            Product name
          </label>
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
          <span className="npr-counter">
            {form.description.length} / 1000
          </span>
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

        {/* Properties — unlimited */}
        <div className="npr-field">
          <label className="npr-label">
            Properties <span className="npr-hint">(optional)</span>
          </label>
          <p className="npr-help">
            Add extra details like Size, Colour, Material. Add as many as
            you need.
          </p>

          <div className="npr-props">
            {properties.map((prop, index) => (
              <div className="npr-prop-row" key={prop.id}>
                <input
                  type="text"
                  className="npr-input npr-prop-name"
                  placeholder="Name (e.g. Size)"
                  value={prop.name}
                  onChange={(e) =>
                    updateProperty(index, 'name', e.target.value)
                  }
                  maxLength={200}
                  disabled={busy}
                />
                <input
                  type="text"
                  className="npr-input npr-prop-value"
                  placeholder="Value (e.g. XL)"
                  value={prop.value}
                  onChange={(e) =>
                    updateProperty(index, 'value', e.target.value)
                  }
                  maxLength={500}
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
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="npr-prop-add"
            onClick={addProperty}
            disabled={busy}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add another property</span>
          </button>
        </div>

        {/* Images — multiple, required */}
        <div className="npr-field">
          <label className="npr-label" htmlFor="npr-images">
            Images <span className="npr-required">*</span>
          </label>

          {imageFiles.length === 0 ? (
            <div className="npr-upload">
              <input
                id="npr-images"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleImagesChange}
                disabled={busy}
                className="npr-upload-input"
              />
              <span className="npr-upload-icon" aria-hidden="true">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </span>
              <span className="npr-upload-text">
                Click to choose one or more images
              </span>
              <span className="npr-upload-sub">
                JPG, PNG, WEBP or GIF · up to 8 MB each · max {MAX_IMAGES}
              </span>
            </div>
          ) : (
            <div className="npr-preview-grid">
              {imageFiles.map((file, index) => (
                <div className="npr-preview" key={`${file.name}-${index}`}>
                  <img
                    src={previewUrls[index]}
                    alt={`Selected ${index + 1}`}
                    className="npr-preview-img"
                  />
                  {index === 0 && (
                    <span className="npr-preview-badge">Cover</span>
                  )}
                  <button
                    type="button"
                    className="npr-preview-remove"
                    onClick={() => removeImage(index)}
                    disabled={busy}
                    aria-label={`Remove image ${index + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}

              {canAddMoreImages && (
                <label
                  className="npr-preview-add"
                  htmlFor="npr-images-add"
                  title="Add more images"
                >
                  <input
                    id="npr-images-add"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleImagesChange}
                    disabled={busy}
                    className="npr-upload-input"
                  />
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Add more</span>
                </label>
              )}
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
            {busy ? <Spinner size={18} label="Saving…" /> : 'Save product'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Newproduct;