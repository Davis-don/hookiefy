// src/components/AddStory.jsx

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { createStory, type StoryCategory } from '../api/storiesApi';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import RichTextEditor from './RichTextEditor';
import './addStory.css';

type Props = {
  onCancel?: () => void;
  onCreated?: () => void;
};

const CATEGORIES: { value: StoryCategory; label: string }[] = [
  { value: 'journey',     label: 'Journey' },
  { value: 'motivation',  label: 'Motivation' },
  { value: 'success',     label: 'Success' },
  { value: 'experience',  label: 'Experience' },
  { value: 'lessons',     label: 'Lessons' },
  { value: 'inspiration', label: 'Inspiration' },
];

const TITLE_MAX = 120;
const CONTENT_MAX = 5000;

/** Returns true if the HTML contains no real text. */
function isBlankHtml(html: string): boolean {
  const text = html
    .replace(/<[^>]*>/g, '')      // strip tags
    .replace(/&nbsp;/g, ' ')      // common entity
    .trim();
  return text.length === 0;
}

function AddStory({ onCancel, onCreated }: Props) {
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');   // HTML string
  const [category, setCategory] = useState<StoryCategory>('journey');
  const [error, setError] = useState('');

  /* ── Publish mutation ─────────────────────────────── */
  const publishMutation = useMutation({
    mutationFn: createStory,
    onSuccess: (res) => {
      toast.success(res.message || 'Story published successfully.');

      setTitle('');
      setContent('');
      setCategory('journey');
      setError('');

      onCreated?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to publish story.');
    },
  });

  /* ── Submit handler ───────────────────────────────── */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError('Please enter a title.');
      return;
    }
    if (trimmedTitle.length > TITLE_MAX) {
      setError(`Title must be ${TITLE_MAX} characters or fewer.`);
      return;
    }
    if (isBlankHtml(content)) {
      setError('Please write your story.');
      return;
    }

    publishMutation.mutate({
      title: trimmedTitle,
      content,                 // send HTML as-is
      category,
    });
  };

  const busy = publishMutation.isPending;

  return (
    <div className="as-shell">
      <form className="as-form" onSubmit={handleSubmit} noValidate>

        {/* ── Header ─────────────────────────────────── */}
        <div className="as-header">
          <h2 className="as-title">Write a Story</h2>
          <p className="as-subtitle">
            Share an experience that might inspire someone else.
          </p>
        </div>

        {/* ── Title ──────────────────────────────────── */}
        <div className="as-field">
          <label htmlFor="as-title" className="as-label">
            Title
          </label>
          <input
            id="as-title"
            type="text"
            className="as-input"
            placeholder="Give your story a title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
            maxLength={TITLE_MAX}
            required
          />
          <span className="as-counter">
            {title.length}/{TITLE_MAX}
          </span>
        </div>

        {/* ── Category ───────────────────────────────── */}
        <div className="as-field">
          <label htmlFor="as-category" className="as-label">
            Category
          </label>
          <select
            id="as-category"
            className="as-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as StoryCategory)}
            disabled={busy}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── Content (Rich Text) ────────────────────── */}
        <div className="as-field">
          <label className="as-label">Your Story</label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Once upon a time…"
            maxLength={CONTENT_MAX}
            disabled={busy}
          />
        </div>

        {/* ── Error ──────────────────────────────────── */}
        {error && <p className="as-error">{error}</p>}

        {/* ── Actions ────────────────────────────────── */}
        <div className="as-actions">
          <button
            type="button"
            className="as-btn as-btn--ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="as-btn as-btn--primary"
            disabled={busy}
          >
            {busy ? (
              <Spinner size={18} label="Publishing…" />
            ) : (
              <>
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
                  <path d="M5 12l5 5L20 7" />
                </svg>
                Publish
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddStory;