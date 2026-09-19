// AddPost.tsx — create a new post
import { useRef, useState } from 'react'
import { FiImage, FiSend, FiXCircle, FiX } from 'react-icons/fi'
import { toast } from 'sonner'
import './addpost.css'

interface AddPostProps {
  onCreated?: () => void
  onCancel?: () => void
}

function AddPost({ onCreated, onCancel }: AddPostProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  /* ── Image pick ───────────────────────────── */
  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    if (!picked) return

    if (!picked.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }

    if (picked.size > 8 * 1024 * 1024) {
      toast.error('Image must be under 8MB.')
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)

    setFile(picked)
    setPreviewUrl(URL.createObjectURL(picked))

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
  }

  /* ── Submit ───────────────────────────────── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!body.trim() && !file) {
      toast.error('Write something or add a photo.')
      return
    }

    setSubmitting(true)

    // TODO: replace with your real POST request
    console.log('Create post', { body, file })

    setTimeout(() => {
      toast.success('Post published!', {
        duration: 2500,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })

      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setBody('')
      setFile(null)
      setPreviewUrl(null)
      setSubmitting(false)

      onCreated?.()
    }, 700)
  }

  const handleCancel = () => {
    if (submitting) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setBody('')
    setFile(null)
    setPreviewUrl(null)
    onCancel?.()
  }

  return (
    <div className="addpost-root">
      {/* Header */}
      <header className="addpost-header">
        <h2 className="addpost-title">New Post</h2>
        <p className="addpost-subtitle">
          Share a thought, photo, or update with your followers.
        </p>
      </header>

      <form
        className="addpost-form"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* Body text */}
        <div className="addpost-group">
          <label className="addpost-label" htmlFor="addpost-body">
            What's on your mind?
          </label>
          <textarea
            id="addpost-body"
            className="addpost-textarea"
            placeholder="Write something..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            disabled={submitting}
            rows={5}
          />
        </div>

        {/* Image upload / preview */}
        <div className="addpost-group">
          <label className="addpost-label">Photo (optional)</label>

          {!previewUrl ? (
            <>
              <label className="addpost-upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="addpost-upload-input"
                  onChange={handlePick}
                  disabled={submitting}
                />
                <FiImage className="addpost-upload-icon" />
                <span className="addpost-upload-text">
                  Tap to add a photo
                </span>
              </label>
            </>
          ) : (
            <div className="addpost-preview">
              <img src={previewUrl} alt="Preview" />
              <button
                type="button"
                className="addpost-preview-remove"
                onClick={removeImage}
                aria-label="Remove image"
                disabled={submitting}
              >
                <FiX />
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="addpost-actions">
          <button
            type="button"
            className="addpost-cancel"
            onClick={handleCancel}
            disabled={submitting}
          >
            <FiXCircle className="addpost-btn-icon" />
            Cancel
          </button>

          <button
            type="submit"
            className="addpost-submit"
            disabled={submitting || (!body.trim() && !file)}
          >
            <FiSend className="addpost-btn-icon" />
            {submitting ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddPost