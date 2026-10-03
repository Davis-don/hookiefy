import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import {
  fetchPost,
  updatePost,
  type PostPayload,
} from '../api/postsApi';
import './editpost.css';

type EditpostProps = {
  postId: number;
  onCancel: () => void;
  onSaved: () => void;
};

type FormState = {
  title: string;
  body: string;
  imageFile: File | null;
};

function Editpost({ postId, onCancel, onSaved }: EditpostProps) {
  const toast = useToast();
  const access = useAuthStore((s) => s.access);
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>({
    title: '',
    body: '',
    imageFile: null,
  });
  const [error, setError] = useState<string>('');
  const [hydrated, setHydrated] = useState(false);

  const {
    data: post,
    isLoading,
    isError,
    error: loadError,
  } = useQuery({
    queryKey: ['post', postId, access],
    queryFn: () => fetchPost(access, postId),
    enabled: !!access && !!postId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (post && !hydrated) {
      setForm({
        title: post.title || '',
        body: post.body || '',
        imageFile: null,
      });
      setHydrated(true);
    }
  }, [post, hydrated]);

  const previewUrl = useMemo(() => {
    if (form.imageFile) return URL.createObjectURL(form.imageFile);
    return post?.image_url ?? null;
  }, [form.imageFile, post?.image_url]);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const mutation = useMutation({
    mutationFn: (payload: PostPayload) => updatePost(access, postId, payload),

    onSuccess: (res) => {
      toast.success(res.message || 'Post updated.');
      queryClient.invalidateQueries({ queryKey: ['business-posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      onSaved();
    },

    onError: (err: any) => {
      toast.error(err?.message || 'Could not update this post.');
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

    if (!form.title.trim()) return setError('Please add a title.');
    if (!form.body.trim()) return setError('Please write something.');
    if (form.body.trim().length < 10)
      return setError('Your post is a bit short — say a little more.');

    mutation.mutate({
      title: form.title.trim(),
      body: form.body.trim(),
      imageFile: form.imageFile,
    });
  };

  if (isLoading) {
    return (
      <div className="ep-state">
        <Spinner size={20} color="#2563EB" label="Loading post…" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="ep-state ep-state-error">
        {(loadError as Error)?.message || 'Could not load this post.'}
      </div>
    );
  }

  const busy = mutation.isPending;

  return (
    <form className="ep-editor" onSubmit={handleSubmit} noValidate>

      {/* ── 1. Image — first thing you see ───────────── */}
      <div className="ep-editor-image">
        {previewUrl ? (
          <div className="ep-editor-image-frame">
            <img
              src={previewUrl}
              alt="Post"
              className="ep-editor-image-img"
            />
            <label
              htmlFor="ep-image"
              className="ep-editor-image-overlay"
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
          <label htmlFor="ep-image" className="ep-editor-image-empty">
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
          <div className="ep-editor-image-note">
            <span className="ep-editor-image-note-dot" aria-hidden="true" />
            <span className="ep-editor-image-note-text">
              New image ready — replaces the current one on save
            </span>
            <button
              type="button"
              className="ep-editor-image-undo"
              onClick={clearNewImage}
              disabled={busy}
            >
              Undo
            </button>
          </div>
        )}

        <input
          id="ep-image"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageChange}
          disabled={busy}
          className="ep-file-hidden"
        />
      </div>

      {/* ── 2. Title ─────────────────────────────────── */}
      <div className="ep-editor-field">
        <label className="ep-editor-label" htmlFor="ep-title">Title</label>
        <input
          id="ep-title"
          type="text"
          className="ep-editor-title"
          placeholder="Give your post a title"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          maxLength={200}
          disabled={busy}
        />
      </div>

      {/* ── 3. Body ──────────────────────────────────── */}
      <div className="ep-editor-field">
        <label className="ep-editor-label" htmlFor="ep-body">Message</label>
        <textarea
          id="ep-body"
          className="ep-editor-body"
          placeholder="What do you want to share?"
          value={form.body}
          onChange={(e) => update('body', e.target.value)}
          rows={3}
          maxLength={1000}
          disabled={busy}
        />
        <span className="ep-editor-counter">{form.body.length} / 1000</span>
      </div>

      {/* ── Error ────────────────────────────────────── */}
      {error && (
        <div className="ep-editor-error">
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
      <div className="ep-editor-actions">
        <button
          type="button"
          className="ep-editor-btn ep-editor-btn-ghost"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="ep-editor-btn ep-editor-btn-primary"
          disabled={busy}
        >
          {busy ? <Spinner size={16} label="Saving…" /> : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

export default Editpost;