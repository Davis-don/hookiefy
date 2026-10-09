// src/features/businesses/pages/Editproduct.tsx

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import {
  fetchProduct,
  updateProduct,
  type ProductPayload,
  type ProductProperty,
} from '../api/productsApi';
import './editproduct.css';

// ============================================================
// TYPES
// ============================================================

type EditproductProps = {
  productId: number;
  onCancel: () => void;
  onSaved: () => void;
};

type FormState = {
  name: string;
  description: string;
  price: string;
};

type EditableProperty = {
  id: string;       // local React key only — never sent
  name: string;
  value: string;
};

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
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

function Editproduct({ productId, onCancel, onSaved }: EditproductProps) {
  const toast = useToast();
  const access = useAuthStore((s) => s.access);
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    price: '',
  });

  // New images the user has picked but not yet uploaded
  const [newImages, setNewImages] = useState<File[]>([]);
  const [replaceImages, setReplaceImages] = useState(false);

  // Unlimited properties
  const [properties, setProperties] = useState<EditableProperty[]>([
    makeEmptyProperty(),
  ]);

  const [error, setError] = useState<string>('');
  const [hydrated, setHydrated] = useState(false);

  // ── Load product ─────────────────────────────────────
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

  // ── Prefill once loaded ──────────────────────────────
  useEffect(() => {
    if (product && !hydrated) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        price:
          product.price !== null && product.price !== undefined
            ? String(product.price)
            : '',
      });

      const loaded = (product.properties ?? []).map((p) => ({
        id: nextPropertyKey(),
        name: p.name || '',
        value: p.value || '',
      }));

      setProperties(loaded.length > 0 ? loaded : [makeEmptyProperty()]);
      setHydrated(true);
    }
  }, [product, hydrated]);

  // ── Previews for newly selected files ────────────────
  const newImagePreviews = useMemo(
    () => newImages.map((f) => URL.createObjectURL(f)),
    [newImages]
  );

  // ── Field update ─────────────────────────────────────
  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  // ── Image picker ─────────────────────────────────────
  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;

    const accepted: File[] = [];
    let firstError = '';

    for (const file of picked) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        if (!firstError) {
          firstError = `"${file.name}" is not a JPG, PNG, WEBP or GIF.`;
        }
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        if (!firstError) firstError = `"${file.name}" is larger than 8 MB.`;
        continue;
      }
      accepted.push(file);
    }

    setNewImages((prev) => [...prev, ...accepted].slice(0, MAX_IMAGES));
    e.target.value = '';
    setError(firstError);
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
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
      updateProduct(access, productId, payload),

    onSuccess: (res) => {
      toast.success(res.message || 'Product updated.');
      queryClient.invalidateQueries({ queryKey: ['business-products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      onSaved();
    },

    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Could not update this product.';
      toast.error(message);
    },
  });

  // ── Submit ───────────────────────────────────────────
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

    const cleanedProperties: ProductProperty[] = properties
      .map((p) => ({ name: p.name.trim(), value: p.value.trim() }))
      .filter((p) => p.name && p.value);

    mutation.mutate({
      name: form.name.trim(),
      description: form.description.trim(),
      price: parsedPrice,
      properties: cleanedProperties,
      imageFiles: newImages,
      replaceImages,
    });
  };

  // ── Loading / error states ───────────────────────────
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
  const existingImages = product.images ?? [];
  const canAddMoreImages = newImages.length < MAX_IMAGES;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <form className="epr-editor" onSubmit={handleSubmit} noValidate>

      {/* ── 1. Existing images ───────────────────────── */}
      {existingImages.length > 0 && (
        <div className="epr-editor-field">
          <label className="epr-editor-label">
            Current images ({existingImages.length})
          </label>

          <div className="epr-image-grid">
            {existingImages.map((img) => (
              <div className="epr-image-tile" key={img.id}>
                <img
                  src={img.image_url}
                  alt="Product"
                  className="epr-image-tile-img"
                />
                {img.is_primary && (
                  <span className="epr-image-tile-badge">Cover</span>
                )}
              </div>
            ))}
          </div>

          <p className="epr-editor-help">
            To remove an image, upload new ones with “Replace all images”
            checked, or delete the product and re-add it.
          </p>
        </div>
      )}

      {/* ── 2. Add new images ─────────────────────────── */}
      <div className="epr-editor-field">
        <label className="epr-editor-label" htmlFor="epr-images">
          Add more images
        </label>

        <div className="epr-image-grid">
          {newImages.map((file, index) => (
            <div className="epr-image-tile" key={`${file.name}-${index}`}>
              <img
                src={newImagePreviews[index]}
                alt={`New ${index + 1}`}
                className="epr-image-tile-img"
              />
              <button
                type="button"
                className="epr-image-tile-remove"
                onClick={() => removeNewImage(index)}
                disabled={busy}
                aria-label={`Remove new image ${index + 1}`}
              >
                ×
              </button>
            </div>
          ))}

          {canAddMoreImages && (
            <label
              htmlFor="epr-images"
              className="epr-image-add"
              title="Add more images"
            >
              <input
                id="epr-images"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleImagesChange}
                disabled={busy}
                className="epr-file-hidden"
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
              <span>Add</span>
            </label>
          )}
        </div>

        {newImages.length > 0 && (
          <label className="epr-replace-toggle">
            <input
              type="checkbox"
              checked={replaceImages}
              onChange={(e) => setReplaceImages(e.target.checked)}
              disabled={busy}
            />
            <span>Replace all existing images with these</span>
          </label>
        )}
      </div>

      {/* ── 3. Name ──────────────────────────────────── */}
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

      {/* ── 4. Description ───────────────────────────── */}
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

      {/* ── 5. Price ─────────────────────────────────── */}
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

      {/* ── 6. Properties — unlimited ────────────────── */}
      <div className="epr-editor-field">
        <label className="epr-editor-label">Properties</label>
        <p className="epr-editor-help">
          Extra details like Size, Colour, Material. Add as many as you need.
        </p>

        <div className="epr-props">
          {properties.map((prop, index) => (
            <div className="epr-prop-row" key={prop.id}>
              <input
                type="text"
                className="epr-prop-name"
                placeholder="Name (e.g. Size)"
                value={prop.name}
                onChange={(e) => updateProperty(index, 'name', e.target.value)}
                maxLength={200}
                disabled={busy}
              />
              <input
                type="text"
                className="epr-prop-value"
                placeholder="Value (e.g. XL)"
                value={prop.value}
                onChange={(e) => updateProperty(index, 'value', e.target.value)}
                maxLength={500}
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
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
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
          className="epr-prop-add"
          onClick={addProperty}
          disabled={busy}
        >
          <svg
            width="14"
            height="14"
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

      {/* ── Error ────────────────────────────────────── */}
      {error && (
        <div className="epr-editor-error">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
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