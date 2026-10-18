// src/features/businesses/pages/Newproduct.tsx

import { useState, useRef, useMemo, useEffect } from 'react';
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
// LIMITS — keep in sync with backend
//   (products/serializers.py + products/views.py)
// ============================================================

const NAME_MIN_LENGTH        = 3;
const NAME_MAX_LENGTH        = 80;
const DESCRIPTION_MIN_LENGTH = 10;
const DESCRIPTION_MAX_LENGTH = 400;

const PROPERTY_NAME_MAX_LENGTH  = 60;
const PROPERTY_VALUE_MAX_LENGTH = 120;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
const ALLOWED_IMAGE_LABEL = 'JPG, PNG, or WEBP';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_IMAGES      = 20;

// Mirror the backend URL detector so we can reject before submitting
const URL_PATTERN = /https?:\/\/|\bwww\.|\b[a-z0-9-]+\.(?:com|net|org|io|co|ke|app|dev|me|info|biz|xyz|shop|store|site|online|link|click|tv|ly|to|gl)\b/i;

const containsUrl = (value: string) => URL_PATTERN.test(value);

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

type EditableProperty = {
  id: string;   // local React key only
  name: string;
  value: string;
};

const initialState: FormState = {
  name: '',
  description: '',
  price: '',
};

let propertyKeyCounter = 0;
const nextPropertyKey = () => `prop-${++propertyKeyCounter}`;

const makeEmptyProperty = (): EditableProperty => ({
  id: nextPropertyKey(),
  name: '',
  value: '',
});

/** Map a server error response → field-keyed messages. */
type ServerFieldErrors = Partial<Record<
  'name' | 'description' | 'price' | 'properties' | 'image',
  string
>>;

function normaliseServerErrors(raw: any): ServerFieldErrors {
  const out: ServerFieldErrors = {};
  if (!raw) return out;

  const pick = (key: string) => {
    const v = raw[key];
    if (!v) return;
    out[key as keyof ServerFieldErrors] = Array.isArray(v) ? String(v[0]) : String(v);
  };

  pick('name');
  pick('description');
  pick('price');
  pick('properties');

  // Generic image / message errors from the view
  if (raw.message && typeof raw.message === 'string') {
    out.image = raw.message;
  }

  // Fallback for something else
  if (!Object.keys(out).length && typeof raw === 'object') {
    for (const k of Object.keys(raw)) {
      if (k === 'code' || k === 'used' || k === 'limit') continue;
      const v = raw[k];
      if (Array.isArray(v) && v[0]) {
        out.image = String(v[0]);
        break;
      }
    }
  }

  return out;
}

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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [properties, setProperties] = useState<EditableProperty[]>([
    makeEmptyProperty(),
  ]);

  // Server field-level errors (shown inline under the field)
  const [serverErrors, setServerErrors] = useState<ServerFieldErrors>({});

  const clearServerError = (key: keyof ServerFieldErrors) => {
    setServerErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const previewUrls = useMemo(
    () => imageFiles.map((f) => URL.createObjectURL(f)),
    [imageFiles]
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  // ── Field updates ────────────────────────────────────
  const update = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
    clearServerError(field as keyof ServerFieldErrors);
  };

  // ── Images ───────────────────────────────────────────
  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;

    const accepted: File[] = [];
    let firstError = '';

    for (const file of picked) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        if (!firstError) firstError = `"${file.name}" is not a ${ALLOWED_IMAGE_LABEL}.`;
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        if (!firstError) firstError = `"${file.name}" is larger than 8 MB.`;
        continue;
      }
      accepted.push(file);
    }

    setImageFiles((prev) => [...prev, ...accepted].slice(0, MAX_IMAGES));
    e.target.value = '';
    setError(firstError);
    if (accepted.length > 0) clearServerError('image');
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
    clearServerError('properties');
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

      setForm(initialState);
      setImageFiles([]);
      setProperties([makeEmptyProperty()]);
      setServerErrors({});
      if (fileInputRef.current) fileInputRef.current.value = '';

      onCreated?.();
    },

    onError: (err: any) => {
      const payload = err?.payload ?? err?.response?.data ?? null;
      const fieldErrors = normaliseServerErrors(payload);

      if (Object.keys(fieldErrors).length > 0) {
        setServerErrors(fieldErrors);
        const firstMsg =
          fieldErrors.name ||
          fieldErrors.description ||
          fieldErrors.price ||
          fieldErrors.properties ||
          fieldErrors.image ||
          'Please fix the highlighted fields.';
        toast.error(firstMsg);
      } else {
        const message =
          err instanceof Error ? err.message : 'Could not create the product.';
        setError(message);
        toast.error(message);
      }
    },
  });

  // ── Live validation ─────────────────────────────────
  const nameTrimmed = form.name.trim();
  const descriptionTrimmed = form.description.trim();

  const nameLength = form.name.length;
  const descriptionLength = form.description.length;

  const nameTooShort = nameTrimmed.length > 0 && nameTrimmed.length < NAME_MIN_LENGTH;
  const nameTooLong  = nameLength > NAME_MAX_LENGTH;
  const nameHasUrl   = containsUrl(nameTrimmed);

  const descTooShort = descriptionTrimmed.length > 0
    && descriptionTrimmed.length < DESCRIPTION_MIN_LENGTH;
  const descTooLong  = descriptionLength > DESCRIPTION_MAX_LENGTH;
  const descHasUrl   = containsUrl(descriptionTrimmed);

  const nameError =
    serverErrors.name ??
    (nameTooLong
      ? `Product name cannot exceed ${NAME_MAX_LENGTH} characters.`
      : nameTooShort
        ? `Product name must be at least ${NAME_MIN_LENGTH} characters.`
        : nameHasUrl
          ? 'Product name cannot contain links or URLs.'
          : null);

  const descriptionError =
    serverErrors.description ??
    (descTooLong
      ? `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters.`
      : descTooShort
        ? `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters.`
        : descHasUrl
          ? 'Description cannot contain links or URLs.'
          : null);

  // Per-row property errors
  const propertyRowErrors = properties.map((p) => {
    const n = p.name.trim();
    const v = p.value.trim();
    if (!n && !v) return { name: null as string | null, value: null as string | null };

    const nameErr =
      n.length > PROPERTY_NAME_MAX_LENGTH
        ? `Name cannot exceed ${PROPERTY_NAME_MAX_LENGTH} characters.`
        : n && containsUrl(n)
          ? 'Name cannot contain links.'
          : !n
            ? 'Name is required.'
            : null;

    const valueErr =
      v.length > PROPERTY_VALUE_MAX_LENGTH
        ? `Value cannot exceed ${PROPERTY_VALUE_MAX_LENGTH} characters.`
        : v && containsUrl(v)
          ? 'Value cannot contain links.'
          : !v
            ? 'Value is required.'
            : null;

    return { name: nameErr, value: valueErr };
  });

  const hasPropertyRowError = propertyRowErrors.some(
    (r) => r.name || r.value
  );

  // Price validity
  let parsedPrice: number | null = null;
  let priceError: string | null = serverErrors.price ?? null;
  if (form.price.trim()) {
    const n = Number(form.price);
    if (Number.isNaN(n) || n < 0) {
      priceError = 'Price must be a positive number.';
    } else {
      parsedPrice = n;
    }
  }

  // ── Can submit? ─────────────────────────────────────
  const canSubmit =
    !mutation.isPending &&
    nameTrimmed.length >= NAME_MIN_LENGTH &&
    !nameTooLong &&
    !nameHasUrl &&
    descriptionTrimmed.length >= DESCRIPTION_MIN_LENGTH &&
    !descTooLong &&
    !descHasUrl &&
    !hasPropertyRowError &&
    !priceError &&
    imageFiles.length > 0;

  // ── Submit ───────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setServerErrors({});

    if (!nameTrimmed) return setError('Please add a product name.');
    if (nameError) return setError(nameError);

    if (!descriptionTrimmed) return setError('Please add a description.');
    if (descriptionError) return setError(descriptionError);

    if (imageFiles.length === 0) {
      return setError('Please attach at least one image.');
    }

    if (priceError) return setError(priceError);
    if (hasPropertyRowError) {
      return setError('Please fix the highlighted property fields.');
    }

    const cleanedProperties: ProductProperty[] = properties
      .map((p) => ({ name: p.name.trim(), value: p.value.trim() }))
      .filter((p) => p.name && p.value);

    mutation.mutate({
      name: nameTrimmed,
      description: descriptionTrimmed,
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

      <div className="npr-header">
        <h2 className="npr-title">Add a product</h2>
        <p className="npr-sub">
          List a product for {businessName || 'this business'}.
        </p>
      </div>

      <form className="npr-form" onSubmit={handleSubmit} noValidate>
        {/* ── Name ───────────────────────────────────── */}
        <div className="npr-field">
          <label className="npr-label" htmlFor="npr-name">
            Product name <span className="npr-required">*</span>
          </label>
          <input
            id="npr-name"
            type="text"
            className={
              'npr-input' + (nameError ? ' is-invalid' : '')
            }
            placeholder="e.g. Blue cotton t-shirt"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            disabled={busy}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? 'npr-name-error' : undefined}
          />
          <div className="npr-field-foot">
            <span id="npr-name-error" className="npr-field-msg">
              {nameError}
            </span>
            <span
              className={
                'npr-counter' +
                (nameTooLong || nameTooShort ? ' is-over' : '')
              }
            >
              {nameLength} / {NAME_MAX_LENGTH}
            </span>
          </div>
        </div>

        {/* ── Description ────────────────────────────── */}
        <div className="npr-field">
          <label className="npr-label" htmlFor="npr-desc">
            Description <span className="npr-required">*</span>
          </label>
          <textarea
            id="npr-desc"
            className={
              'npr-input npr-textarea' +
              (descriptionError ? ' is-invalid' : '')
            }
            placeholder="What is it? Who is it for?"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={4}
            disabled={busy}
            aria-invalid={descriptionError ? true : undefined}
            aria-describedby={
              descriptionError ? 'npr-desc-error' : undefined
            }
          />
          <div className="npr-field-foot">
            <span id="npr-desc-error" className="npr-field-msg">
              {descriptionError}
            </span>
            <span
              className={
                'npr-counter' +
                (descTooLong || descTooShort ? ' is-over' : '')
              }
            >
              {descriptionLength} / {DESCRIPTION_MAX_LENGTH}
            </span>
          </div>
        </div>

        {/* ── Price ─────────────────────────────────── */}
        <div className="npr-field">
          <label className="npr-label" htmlFor="npr-price">
            Price (KES) <span className="npr-hint">(optional)</span>
          </label>
          <input
            id="npr-price"
            type="number"
            className={'npr-input' + (priceError ? ' is-invalid' : '')}
            placeholder="e.g. 1500"
            value={form.price}
            onChange={(e) => update('price', e.target.value)}
            min={0}
            step="1"
            disabled={busy}
            aria-invalid={priceError ? true : undefined}
            aria-describedby={priceError ? 'npr-price-error' : undefined}
          />
          {priceError && (
            <span id="npr-price-error" className="npr-field-msg">
              {priceError}
            </span>
          )}
        </div>

        {/* ── Properties ────────────────────────────── */}
        <div className="npr-field">
          <label className="npr-label">
            Properties <span className="npr-hint">(optional)</span>
          </label>
          <p className="npr-help">
            Add extra details like Size, Colour, Material. Add as many as
            you need.
          </p>

          {serverErrors.properties && (
            <p className="npr-field-msg">{serverErrors.properties}</p>
          )}

          <div className="npr-props">
            {properties.map((prop, index) => {
              const rowErr = propertyRowErrors[index];
              return (
                <div className="npr-prop-row" key={prop.id}>
                  <div className="npr-prop-col">
                    <input
                      type="text"
                      className={
                        'npr-input npr-prop-name' +
                        (rowErr.name ? ' is-invalid' : '')
                      }
                      placeholder="Name (e.g. Size)"
                      value={prop.name}
                      onChange={(e) =>
                        updateProperty(index, 'name', e.target.value)
                      }
                      disabled={busy}
                      aria-invalid={rowErr.name ? true : undefined}
                    />
                    {rowErr.name && (
                      <span className="npr-field-msg">{rowErr.name}</span>
                    )}
                  </div>

                  <div className="npr-prop-col">
                    <input
                      type="text"
                      className={
                        'npr-input npr-prop-value' +
                        (rowErr.value ? ' is-invalid' : '')
                      }
                      placeholder="Value (e.g. XL)"
                      value={prop.value}
                      onChange={(e) =>
                        updateProperty(index, 'value', e.target.value)
                      }
                      disabled={busy}
                      aria-invalid={rowErr.value ? true : undefined}
                    />
                    {rowErr.value && (
                      <span className="npr-field-msg">{rowErr.value}</span>
                    )}
                  </div>

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
              );
            })}
          </div>

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
        </div>

        {/* ── Images ────────────────────────────────── */}
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
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImagesChange}
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
                Click to choose one or more images
              </span>
              <span className="npr-upload-sub">
                {ALLOWED_IMAGE_LABEL} · up to 8 MB each · max {MAX_IMAGES}
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
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImagesChange}
                    disabled={busy}
                    className="npr-upload-input"
                  />
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Add more</span>
                </label>
              )}
            </div>
          )}

          {serverErrors.image && (
            <span className="npr-field-msg">{serverErrors.image}</span>
          )}
        </div>

        {error && <p className="npr-error">{error}</p>}

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
            disabled={busy || !canSubmit}
            aria-disabled={busy || !canSubmit}
            title={
              !canSubmit && !busy
                ? 'Fix the highlighted fields before saving.'
                : undefined
            }
          >
            {busy ? <Spinner size={18} label="Saving…" /> : 'Save product'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Newproduct;