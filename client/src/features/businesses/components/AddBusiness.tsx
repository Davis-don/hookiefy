import { useState } from 'react';
import './addBusiness.css';

type AddBusinessProps = {
  onCancel?: () => void;
  onCreated?: () => void;
};

type BusinessKind = 'service' | 'offer' | 'product' | 'location';

function AddBusiness({ onCancel, onCreated }: AddBusinessProps) {
  const [kind, setKind] = useState<BusinessKind>('service');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return setError('Please enter a title.');

    // TODO: POST to /services/ with auth token, then call onCreated()
    console.log('Create business:', { kind, title, description, price });
    onCreated?.();
  };

  return (
    <form className="adb-form" onSubmit={handleSubmit} noValidate>
      {/* Kind selector */}
      <div className="adb-field">
        <label className="adb-label" htmlFor="adb-kind">Type</label>
        <select
          id="adb-kind"
          className="adb-input adb-select"
          value={kind}
          onChange={(e) => setKind(e.target.value as BusinessKind)}
        >
          <option value="service">Service</option>
          <option value="offer">Offer</option>
          <option value="product">Product</option>
          <option value="location">Location</option>
        </select>
      </div>

      {/* Title */}
      <div className="adb-field">
        <label className="adb-label" htmlFor="adb-title">Title</label>
        <input
          id="adb-title"
          className="adb-input"
          type="text"
          placeholder="e.g. Home plumbing repairs"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="adb-field">
        <label className="adb-label" htmlFor="adb-desc">Description</label>
        <textarea
          id="adb-desc"
          className="adb-input adb-textarea"
          placeholder="Describe what you offer"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>

      {/* Price */}
      <div className="adb-field">
        <label className="adb-label" htmlFor="adb-price">Price (KES)</label>
        <input
          id="adb-price"
          className="adb-input"
          type="number"
          min="0"
          placeholder="Optional"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>

      {error && <p className="adb-error">{error}</p>}

      <div className="adb-actions">
        {onCancel && (
          <button
            type="button"
            className="adb-btn adb-btn-ghost"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="adb-btn adb-btn-primary">
          Save Business
        </button>
      </div>
    </form>
  );
}

export default AddBusiness;