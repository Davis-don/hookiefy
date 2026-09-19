// AddPost.tsx — create a new story with rich text content
import { useRef, useState } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import {
  FiImage,
  FiSend,
  FiXCircle,
  FiX,
  FiTag,
  FiType,
} from 'react-icons/fi'
import { toast } from 'sonner'
import { useAuthStore } from '../../../store/authtokenstore'
import './addpost.css'

interface AddPostProps {
  onCreated?: () => void
  onCancel?: () => void
}

type StoryCategory = 'ideas' | 'success' | 'fun'

interface FieldErrors {
  title?: string
  content?: string
  category?: string
  image?: string
}

const CATEGORY_OPTIONS: {
  value: StoryCategory
  label: string
}[] = [
  { value: 'ideas',   label: 'Ideas & Tips' },
  { value: 'success', label: 'Success Stories' },
  { value: 'fun',     label: 'Fun' },
]

const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB

/* ────────────────────────────────────────────────────────
   Quill editor configuration
   ──────────────────────────────────────────────────────── */

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['blockquote', 'code-block'],
    ['link'],
    ['clean'],
  ],
}

const QUILL_FORMATS = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet',
  'align',
  'blockquote', 'code-block',
  'link',
]

/* Strip HTML to measure plain-text length for validation */
function plainTextLength(html: string) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return (tmp.textContent || tmp.innerText || '').trim().length
}

function AddPost({ onCreated, onCancel }: AddPostProps) {
  const { access: accessToken } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<StoryCategory | ''>('')

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  /* ── Image pick ───────────────────────────── */
  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    if (!picked) return

    if (!picked.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }

    if (picked.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be under 8MB.')
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)

    setFile(picked)
    setPreviewUrl(URL.createObjectURL(picked))

    if (fieldErrors.image) {
      setFieldErrors((prev) => ({ ...prev, image: undefined }))
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
  }

  /* ── Reset everything ─────────────────────── */
  const resetForm = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setTitle('')
    setContent('')
    setCategory('')
    setFile(null)
    setPreviewUrl(null)
    setFieldErrors({})
  }

  /* ── Submit to /stories/create/ ───────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    /* ---- client-side validation ---- */
    const errors: FieldErrors = {}

    if (!title.trim() || title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters.'
    }

    const contentLength = plainTextLength(content)
    if (contentLength < 10) {
      errors.content = 'Content must be at least 10 characters.'
    }

    if (!category) {
      errors.category = 'Please choose a category.'
    }

    if (!file) {
      errors.image = 'A photo is required for a story.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      toast.error('Please fix the highlighted fields.', {
        duration: 3000,
      })
      return
    }

    if (!accessToken) {
      toast.error('You need to be logged in to post.')
      return
    }

    /* ---- build the multipart payload ---- */
    const fd = new FormData()
    fd.append('title', title.trim())
    fd.append('content', content)          // HTML string
    fd.append('category', category as string)
    fd.append('image', file as File)

    setSubmitting(true)
    setFieldErrors({})

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/stories/create/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            // NOTE: do NOT set Content-Type — the browser
            // adds the correct multipart boundary for us.
          },
          body: fd,
        }
      )

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        const err = data as Record<string, unknown> | null
        if (err && typeof err === 'object') {
          const flat: FieldErrors = {}
          for (const [k, v] of Object.entries(err)) {
            if (
              k === 'title' ||
              k === 'content' ||
              k === 'category' ||
              k === 'image'
            ) {
              flat[k as keyof FieldErrors] = Array.isArray(v)
                ? v.join(', ')
                : String(v)
            }
          }
          if (Object.keys(flat).length > 0) {
            setFieldErrors(flat)
          }
        }

        throw new Error(
          (data && (data.detail || data.message)) ||
            'Failed to publish story'
        )
      }

      toast.success('Story published!', {
        duration: 2500,
        icon: '✅',
      })

      resetForm()
      onCreated?.()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Something went wrong.',
        { duration: 4500 }
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (submitting) return
    resetForm()
    onCancel?.()
  }

  return (
    <div className="addpost-root">
      {/* Header */}
      <header className="addpost-header">
        <h2 className="addpost-title">New Story</h2>
        <p className="addpost-subtitle">
          Share a thought, a lesson, or a moment with your followers.
        </p>
      </header>

      <form
        className="addpost-form"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* Title */}
        <div className="addpost-group">
          <label className="addpost-label" htmlFor="addpost-title">
            <FiType className="addpost-label-icon" /> Title
          </label>
          <input
            id="addpost-title"
            type="text"
            className={`addpost-input ${
              fieldErrors.title ? 'addpost-input-error' : ''
            }`}
            placeholder="Give your story a short title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (fieldErrors.title) {
                setFieldErrors((p) => ({ ...p, title: undefined }))
              }
            }}
            maxLength={200}
            disabled={submitting}
          />
          {fieldErrors.title && (
            <span className="addpost-field-error">
              {fieldErrors.title}
            </span>
          )}
        </div>

        {/* Content — rich text editor */}
        <div className="addpost-group">
          <label className="addpost-label" htmlFor="addpost-content">
            Content
          </label>

          <div
            className={`addpost-editor ${
              fieldErrors.content ? 'addpost-editor-error' : ''
            }`}
          >
            <ReactQuill
              theme="snow"
              value={content}
              onChange={(html) => {
                setContent(html)
                if (fieldErrors.content) {
                  setFieldErrors((p) => ({ ...p, content: undefined }))
                }
              }}
              modules={QUILL_MODULES}
              formats={QUILL_FORMATS}
              placeholder="Write your story…"
              readOnly={submitting}
            />
          </div>

          {fieldErrors.content && (
            <span className="addpost-field-error">
              {fieldErrors.content}
            </span>
          )}
        </div>

        {/* Category */}
        <div className="addpost-group">
          <label className="addpost-label" htmlFor="addpost-category">
            <FiTag className="addpost-label-icon" /> Category
          </label>
          <select
            id="addpost-category"
            className={`addpost-input addpost-select ${
              fieldErrors.category ? 'addpost-input-error' : ''
            }`}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as StoryCategory | '')
              if (fieldErrors.category) {
                setFieldErrors((p) => ({ ...p, category: undefined }))
              }
            }}
            disabled={submitting}
          >
            <option value="">Choose a category…</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {fieldErrors.category && (
            <span className="addpost-field-error">
              {fieldErrors.category}
            </span>
          )}
        </div>

        {/* Image upload / preview */}
        <div className="addpost-group">
          <label className="addpost-label">
            <FiImage className="addpost-label-icon" /> Photo
            <span className="addpost-required">*</span>
          </label>

          {!previewUrl ? (
            <label
              className={`addpost-upload ${
                fieldErrors.image ? 'addpost-upload-error' : ''
              }`}
            >
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
              <span className="addpost-upload-hint">
                JPG, PNG, or WEBP — up to 8MB
              </span>
            </label>
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

          {fieldErrors.image && (
            <span className="addpost-field-error">
              {fieldErrors.image}
            </span>
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
            disabled={
              submitting ||
              !title.trim() ||
              plainTextLength(content) < 1 ||
              !category ||
              !file
            }
          >
            {submitting ? (
              <>
                <span className="addpost-spinner" />
                Publishing…
              </>
            ) : (
              <>
                <FiSend className="addpost-btn-icon" />
                Publish
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddPost