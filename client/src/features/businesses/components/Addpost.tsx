import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import './addpost.css';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

type AddpostProps = {
  businessId: number;
  businessName?: string;
  onBack?: () => void;
  onCreated?: () => void;
};

type PostType = 'update' | 'offer' | 'announcement' | 'event';

type FormState = {
  postType: PostType;
  title: string;
  body: string;
  isPinned: boolean;
};

const initialState: FormState = {
  postType: 'update',
  title: '',
  body: '',
  isPinned: false,
};

async function createPost(
  token: string | null,
  businessId: number,
  payload: FormState
): Promise<{ message?: string }> {
  if (!token) throw new Error('Not authenticated.');

  const res = await fetch(`${API_BASE}/businesses/${businessId}/posts/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      post_type: payload.postType,
      title: payload.title,
      body: payload.body,
      is_pinned: payload.isPinned,
    }),
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    let message = 'Could not publish this post.';
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') message = data.message;
      else if (typeof data.detail === 'string') message = data.detail;
      else {
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey])) {
          message = `${firstKey}: ${data[firstKey][0]}`;
        }
      }
    }
    throw new Error(message);
  }

  return (data ?? { message: 'Published.' }) as { message?: string };
}

function Addpost({
  businessId,
  businessName,
  onBack,
  onCreated,
}: AddpostProps) {
  const toast = useToast();
  const access = useAuthStore((s) => s.access);
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string>('');

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const mutation = useMutation({
    mutationFn: (payload: FormState) =>
      createPost(access, businessId, payload),

    onSuccess: (res) => {
      toast.success(res.message || 'Post published.');
      queryClient.invalidateQueries({ queryKey: ['business-posts', businessId] });
      setForm(initialState);
      onCreated?.();
    },

    onError: (err: any) => {
      toast.error(err?.message || 'Could not publish this post.');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) return setError('Please add a title.');
    if (!form.body.trim()) return setError('Please write something.');
    if (form.body.trim().length < 10)
      return setError('Your post is a bit short — say a little more.');

    mutation.mutate({
      postType: form.postType,
      title: form.title.trim(),
      body: form.body.trim(),
      isPinned: form.isPinned,
    });
  };

  const busy = mutation.isPending;

  const postTypes: { key: PostType; label: string; icon: string }[] = [
    { key: 'update',       label: 'Update',       icon: '📝' },
    { key: 'offer',        label: 'Offer',        icon: '🏷️' },
    { key: 'announcement', label: 'Announcement', icon: '📣' },
    { key: 'event',        label: 'Event',        icon: '📅' },
  ];

  return (
    <div className="ap-shell">
      {/* ── Top bar ────────────────────────────────── */}
      <div className="ap-topbar">
        <div className="ap-topbar-left">
          {onBack && (
            <button
              type="button"
              className="ap-icon-btn ap-icon-btn-back"
              onClick={onBack}
              aria-label="Back"
              title="Back"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          <span className="ap-topbar-crumb">
            {businessName ? `Back to ${businessName}` : 'Back'}
          </span>
        </div>
      </div>

      {/* ── Header ─────────────────────────────────── */}
      <div className="ap-header">
        <h2 className="ap-title">Add a post</h2>
        <p className="ap-sub">
          Share an update, offer, or announcement with the people who follow
          this business.
        </p>
      </div>

      {/* ── Form ───────────────────────────────────── */}
      <form className="ap-form" onSubmit={handleSubmit} noValidate>
        {/* Post type tiles */}
        <div className="ap-field">
          <label className="ap-label">What kind of post is this?</label>
          <div className="ap-type-grid">
            {postTypes.map((t) => (
              <button
                key={t.key}
                type="button"
                className={
                  'ap-type-tile' +
                  (form.postType === t.key ? ' is-selected' : '')
                }
                onClick={() => update('postType', t.key)}
                disabled={busy}
              >
                <span className="ap-type-icon">{t.icon}</span>
                <span className="ap-type-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="ap-field">
          <label className="ap-label" htmlFor="ap-title">Title</label>
          <input
            id="ap-title"
            type="text"
            className="ap-input"
            placeholder="e.g. Weekend promo — 20% off all services"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            maxLength={120}
            disabled={busy}
          />
          <span className="ap-counter">
            {form.title.length} / 120
          </span>
        </div>

        {/* Body */}
        <div className="ap-field">
          <label className="ap-label" htmlFor="ap-body">Message</label>
          <textarea
            id="ap-body"
            className="ap-input ap-textarea"
            placeholder="Write your post…"
            value={form.body}
            onChange={(e) => update('body', e.target.value)}
            rows={6}
            maxLength={1000}
            disabled={busy}
          />
          <span className="ap-counter">
            {form.body.length} / 1000
          </span>
        </div>

        {/* Pin toggle */}
        <label className="ap-check">
          <input
            type="checkbox"
            checked={form.isPinned}
            onChange={(e) => update('isPinned', e.target.checked)}
            disabled={busy}
          />
          <span className="ap-check-box" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="3.4" strokeLinecap="round"
              strokeLinejoin="round">
              <polyline points="4 12 10 18 20 6" />
            </svg>
          </span>
          <span className="ap-check-text">
            Pin this post to the top of the business page
          </span>
        </label>

        {error && <p className="ap-error">{error}</p>}

        {/* Actions */}
        <div className="ap-actions">
          {onBack && (
            <button
              type="button"
              className="ap-btn ap-btn-ghost"
              onClick={onBack}
              disabled={busy}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="ap-btn ap-btn-primary"
            disabled={busy}
          >
            {busy ? <Spinner size={18} label="Publishing…" /> : 'Publish post'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Addpost;