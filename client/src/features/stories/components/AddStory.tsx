import { useState } from 'react';
import './addStory.css';

type AddStoryProps = {
  onCancel?: () => void;
  onCreated?: () => void;
};

type StoryKind = 'photo' | 'video' | 'text' | 'poll' | 'countdown' | 'live';

function AddStory({ onCancel, onCreated }: AddStoryProps) {
  const [kind, setKind] = useState<StoryKind>('photo');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return setError('Please enter a title.');

    // TODO: POST to /stories/ with auth token, then call onCreated()
    console.log('Create story:', { kind, title, caption });
    onCreated?.();
  };

  return (
    <form className="ads-form" onSubmit={handleSubmit} noValidate>
      <div className="ads-field">
        <label className="ads-label" htmlFor="ads-kind">Type</label>
        <select
          id="ads-kind"
          className="ads-input ads-select"
          value={kind}
          onChange={(e) => setKind(e.target.value as StoryKind)}
        >
          <option value="photo">Photo</option>
          <option value="video">Video</option>
          <option value="text">Text</option>
          <option value="poll">Poll</option>
          <option value="countdown">Countdown</option>
          <option value="live">Go Live</option>
        </select>
      </div>

      <div className="ads-field">
        <label className="ads-label" htmlFor="ads-title">Title</label>
        <input
          id="ads-title"
          className="ads-input"
          type="text"
          placeholder="e.g. Weekend promo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="ads-field">
        <label className="ads-label" htmlFor="ads-caption">Caption</label>
        <textarea
          id="ads-caption"
          className="ads-input ads-textarea"
          placeholder="Say something about this story"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
        />
      </div>

      {error && <p className="ads-error">{error}</p>}

      <div className="ads-actions">
        {onCancel && (
          <button
            type="button"
            className="ads-btn ads-btn-ghost"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="ads-btn ads-btn-primary">
          Post Story
        </button>
      </div>
    </form>
  );
}

export default AddStory;