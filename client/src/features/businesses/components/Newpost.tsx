import { useState, useRef, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import { createPost, type PostPayload } from '../api/postsApi';
import './newpost.css';

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

  const previewUrl = useMemo(() => {
    if (!form.imageFile) return null;
    return URL.createObjectURL(form.imageFile);
  }, [form.imageFile]);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
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
      toast.error(err?.message || 'Could not publish this post.');
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

    if (!form.title.trim()) return setError('Please add a title.');
    if (!form.body.trim()) return setError('Please write something.');
    if (form.body.trim().length < 10)
      return setError('Your post is a bit short — say a little more.');
    if (!form.imageFile) return setError('Please attach an image.');

    mutation.mutate({
      title: form.title.trim(),
      body: form.body.trim(),
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
            className="np-input"
            placeholder="e.g. Weekend promo — 20% off all services"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            maxLength={200}
            disabled={busy}
          />
          <span className="np-counter">{form.title.length} / 200</span>
        </div>

        {/* Body */}
        <div className="np-field">
          <label className="np-label" htmlFor="np-body">Message</label>
          <textarea
            id="np-body"
            className="np-input np-textarea"
            placeholder="Write your post…"
            value={form.body}
            onChange={(e) => update('body', e.target.value)}
            rows={6}
            maxLength={1000}
            disabled={busy}
          />
          <span className="np-counter">{form.body.length} / 1000</span>
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
                accept="image/jpeg,image/png,image/webp,image/gif"
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
                JPG, PNG, WEBP or GIF · up to 8 MB
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
            disabled={busy}
          >
            {busy ? <Spinner size={18} label="Publishing…" /> : 'Publish post'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Newpost;