// src/components/EditStory.jsx

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import RichTextEditor from './RichTextEditor';
import {
  updateStory,
  type Story,
  type StoryCategory,
} from '../api/storiesApi';
import './editStory.css';

type Props = {
  story: Story;
  onCancel: () => void;
  onSaved: () => void;
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

function isBlankHtml(html: string): boolean {
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return text.length === 0;
}

function EditStory({ story, onCancel, onSaved }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(story.title ?? '');
  const [content, setContent] = useState(story.content ?? '');
  const [category, setCategory] = useState<StoryCategory>(story.category);
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(story.title ?? '');
    setContent(story.content ?? '');
    setCategory(story.category);
    setError('');
  }, [story.id]);

  const mutation = useMutation({
    mutationFn: (payload: {
      title: string;
      content: string;
      category: StoryCategory;
    }) => updateStory(story.id, payload),

    onSuccess: (res) => {
      toast.success(res.message || 'Story updated.');

      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['my-stories'] });

      onSaved();
    },

    onError: (err: any) => {
      toast.error(err?.message || 'Could not update this story.');
    },
  });

  const busy = mutation.isPending;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const trimmedTitle = title.trim();

    if (!trimmedTitle) return setError('Please enter a title.');
    if (trimmedTitle.length > TITLE_MAX)
      return setError(`Title must be ${TITLE_MAX} characters or fewer.`);
    if (isBlankHtml(content)) return setError('Please write your story.');

    mutation.mutate({ title: trimmedTitle, content, category });
  };

  return (
    <form className="es-form" onSubmit={handleSubmit} noValidate>
      <div className="es-header">
        <span className="es-header-badge">Editing</span>
        <h3 className="es-header-title">Update your story</h3>
      </div>

      {/* Title */}
      <div className="es-field">
        <label htmlFor="es-title" className="es-label">Title</label>
        <input
          id="es-title"
          type="text"
          className="es-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          maxLength={TITLE_MAX}
          placeholder="Give your story a title…"
          required
        />
        <span className="es-counter">{title.length}/{TITLE_MAX}</span>
      </div>

      {/* Category */}
      <div className="es-field">
        <label htmlFor="es-category" className="es-label">Category</label>
        <select
          id="es-category"
          className="es-select"
          value={category}
          onChange={(e) => setCategory(e.target.value as StoryCategory)}
          disabled={busy}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="es-field">
        <label className="es-label">Your Story</label>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Continue your story…"
          maxLength={CONTENT_MAX}
          disabled={busy}
        />
      </div>

      {error && (
        <div className="es-error">
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

      <div className="es-actions">
        <button
          type="button"
          className="es-btn es-btn-ghost"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="es-btn es-btn-primary"
          disabled={busy}
        >
          {busy ? <Spinner size={16} label="Saving…" /> : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

export default EditStory;