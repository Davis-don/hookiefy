// src/pages/accounts/User/components/Newpost.tsx

import { useState, useRef, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import { createPost, type PostPayload } from '../api/postsApi';
import './newpost.css';

/* ──────────────────────────────────────────────────────────
   Limits — keep in sync with backend
   (posts/views.py + posts/serializers.py)
   ────────────────────────────────────────────────────────── */

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH  = 1000;
const MIN_BODY_LENGTH  = 10;
const MAX_IMAGE_BYTES  = 8 * 1024 * 1024; // 8 MB

const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

const ALLOWED_IMAGE_LABEL = 'PNG, JPEG or WEBP';

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */

type NewpostProps = {
  businessId: number;
  businessName?: string;
  onBack?: () => void;
  onCreated?: () => void;
};

type FormState = {
  title: string;
  body: string;
  imageFile: File | null;
};

const initialState: FormState = {
  title: '',
  body: '',
  imageFile: null,
};

/* ──────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────── */

function Newpost({
  businessId,
  businessName,
  onBack,
  onCreated,
}: NewpostProps) {
  const toast = useToast();
  const access = useAuthStore((s) => s.access);
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string>('');

  /* Preview URL — revoke on change / unmount so we don't leak */
  const previewUrl = useMemo(() => {
    if (!form.imageFile) return null;
    return URL.createObjectURL(form.imageFile);
  }, [form.imageFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const update = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const mutation = useMutation({
    mutationFn: (payload: PostPayload) =>
      createPost(access, businessId, payload),

    onSuccess: (res) => {
      toast.success(res.message || 'Post published.');
      queryClient.invalidateQueries({
        queryKey: ['business-posts', businessId],
      });
      setForm(initialState);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onCreated?.();
    },

    onError: (err: any) => {
      const message =
        err?.message || 'Could not publish this post. Please try again.';
      setError(message);
      toast.error(message);
    },
  });

  /* ── Image selection with validation ────────────────── */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError(
        `Unsupported file type. Please choose ${ALLOWED_IMAGE_LABEL}.`
      );
      e.target.value = '';
      return;
    }

    if (file.size <= 0) {
      setError('That file appears to be empty.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      const mb = MAX_IMAGE_BYTES / (1024 * 1024);
      setError(`Image is too large. Maximum size is ${mb} MB.`);
      e.target.value = '';
      return;
    }

    setForm((prev) => ({ ...prev, imageFile: file }));
    setError('');
  };

  const clearImage = () => {
    setForm((prev) => ({ ...prev, imageFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError('');
  };

  /* ── Per-field live validation ──────────────────────── */

  const titleTrimmed = form.title.trim();
  const bodyTrimmed  = form.body.trim();

  const titleLength  = form.title.length;
  const bodyLength   = form.body.length;

  const titleOver    = titleLength > MAX_TITLE_LENGTH;
  const bodyOver     = bodyLength  > MAX_BODY_LENGTH;
  const bodyTooShort = bodyTrimmed.length > 0
    && bodyTrimmed.length < MIN_BODY_LENGTH;

  // Individual error strings (null when fine)
  const titleError = titleOver
    ? `Title cannot exceed ${MAX_TITLE_LENGTH} characters.`
    : null;

  const bodyError = bodyOver
    ? `Message cannot exceed ${MAX_BODY_LENGTH} characters.`
    : bodyTooShort
      ? `Message is a bit short — write at least ${MIN_BODY_LENGTH} characters.`
      : null;

  /* Form is valid when:
     - title present and within limit
     - body present, at least MIN_BODY_LENGTH, within limit
     - image attached and within the allowed limits
     - no mutation currently running */
  const canSubmit =
    !mutation.isPending &&
    titleTrimmed.length > 0 &&
    !titleOver &&
    bodyTrimmed.length >= MIN_BODY_LENGTH &&
    !bodyOver &&
    form.imageFile !== null &&
    ALLOWED_IMAGE_TYPES.includes(form.imageFile.type) &&
    form.imageFile.size > 0 &&
    form.imageFile.size <= MAX_IMAGE_BYTES;

  /* ── Submit-time validation ─────────────────────────── */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!titleTrimmed) {
      return setError('Please add a title.');
    }
    if (titleOver) {
      return setError(
        `Title cannot exceed ${MAX_TITLE_LENGTH} characters.`
      );
    }

    if (!bodyTrimmed) {
      return setError('Please write a message.');
    }
    if (bodyTooShort) {
      return setError(
        `Message is a bit short — write at least ${MIN_BODY_LENGTH} characters.`
      );
    }
    if (bodyOver) {
      return setError(
        `Message cannot exceed ${MAX_BODY_LENGTH} characters.`
      );
    }

    if (!form.imageFile) {
      return setError('Please attach an image.');
    }
    if (!ALLOWED_IMAGE_TYPES.includes(form.imageFile.type)) {
      return setError(
        `Unsupported file type. Please choose ${ALLOWED_IMAGE_LABEL}.`
      );
    }
    if (form.imageFile.size > MAX_IMAGE_BYTES) {
      const mb = MAX_IMAGE_BYTES / (1024 * 1024);
      return setError(`Image is too large. Maximum size is ${mb} MB.`);
    }

    mutation.mutate({
      title: titleTrimmed,
      body: bodyTrimmed,
      imageFile: form.imageFile,
    });
  };

  const busy = mutation.isPending;

  return (
    <div className="np-shell">
      {/* ── Top bar with back ──────────────────────── */}
      {onBack && (
        <div className="np-topbar">
          <button
            type="button"
            className="np-icon-btn np-icon-btn-back"
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
      <div className="np-header">
        <h2 className="np-title">Add a post</h2>
        <p className="np-sub">
          Share an update with the people who follow{' '}
          {businessName || 'this business'}.
        </p>
      </div>

      {/* ── Form ───────────────────────────────────── */}
      <form className="np-form" onSubmit={handleSubmit} noValidate>
        {/* Title */}
        <div className="np-field">
          <label className="np-label" htmlFor="np-title">Title</label>
          <input
            id="np-title"
            type="text"
            className={'np-input' + (titleOver ? ' is-invalid' : '')}
            placeholder="e.g. Weekend promo — 20% off all services"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            disabled={busy}
            aria-invalid={titleOver || undefined}
            aria-describedby={titleError ? 'np-title-error' : undefined}
          />
          <div className="np-field-foot">
            <span
              id="np-title-error"
              className="np-field-msg"
            >
              {titleError}
            </span>
            <span
              className={'np-counter' + (titleOver ? ' is-over' : '')}
            >
              {titleLength} / {MAX_TITLE_LENGTH}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="np-field">
          <label className="np-label" htmlFor="np-body">Message</label>
          <textarea
            id="np-body"
            className={'np-input np-textarea' + (bodyError ? ' is-invalid' : '')}
            placeholder="Write your post…"
            value={form.body}
            onChange={(e) => update('body', e.target.value)}
            rows={6}
            disabled={busy}
            aria-invalid={bodyError ? true : undefined}
            aria-describedby={bodyError ? 'np-body-error' : undefined}
          />
          <div className="np-field-foot">
            <span
              id="np-body-error"
              className="np-field-msg"
            >
              {bodyError}
            </span>
            <span
              className={
                'np-counter' +
                (bodyOver || bodyTooShort ? ' is-over' : '')
              }
            >
              {bodyLength} / {MAX_BODY_LENGTH}
            </span>
          </div>
        </div>

        {/* Image upload — required */}
        <div className="np-field">
          <label className="np-label" htmlFor="np-image">
            Image <span className="np-required">*</span>
          </label>

          {!form.imageFile ? (
            <div className="np-upload">
              <input
                id="np-image"
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleImageChange}
                disabled={busy}
                className="np-upload-input"
              />
              <span className="np-upload-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </span>
              <span className="np-upload-text">
                Click to choose an image
              </span>
              <span className="np-upload-sub">
                {ALLOWED_IMAGE_LABEL} · up to{' '}
                {MAX_IMAGE_BYTES / (1024 * 1024)} MB
              </span>
            </div>
          ) : (
            <div className="np-preview">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Selected"
                  className="np-preview-img"
                />
              )}
              <div className="np-preview-meta">
                <span className="np-preview-name">
                  {form.imageFile.name}
                </span>
                <span className="np-preview-size">
                  {(form.imageFile.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  className="np-preview-remove"
                  onClick={clearImage}
                  disabled={busy}
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <p className="np-error">{error}</p>}

        {/* Actions */}
        <div className="np-actions">
          {onBack && (
            <button
              type="button"
              className="np-btn np-btn-ghost"
              onClick={onBack}
              disabled={busy}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="np-btn np-btn-primary"
            disabled={busy || !canSubmit}
            aria-disabled={busy || !canSubmit}
            title={
              !canSubmit && !busy
                ? 'Fix the highlighted fields before publishing.'
                : undefined
            }
          >
            {busy ? (
              <Spinner size={18} label="Publishing…" />
            ) : (
              'Publish post'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Newpost;