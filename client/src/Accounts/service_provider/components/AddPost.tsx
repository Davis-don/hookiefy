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

/**
 * Shape of business / limit errors returned by the server.
 */
interface ServerErrorPayload {
  message?: string
  error_code?: string
  detail?: string
  plan?: {
    id: number
    name: string
    slug: string
    stories_per_month?: number | null
  } | null
  used?: number
  limit?: number | null
  remaining?: number
  upgrade_plan?: {
    id: number
    name: string
    slug: string
    price: string
    stories_per_month?: number | null
  } | null
  errors?: Record<string, unknown>
  [key: string]: unknown
}

const CATEGORY_OPTIONS: {
  value: StoryCategory
  label: string
}[] = [
  { value: 'ideas',   label: 'Ideas & Tips' },
  { value: 'success', label: 'Success Stories' },
  { value: 'fun',     label: 'Fun' },
]

/* NOTE: no image size limit. The server enforces anything
   it needs to; the client just lets the user pick a file. */

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

/* ────────────────────────────────────────────────────────
   Response parsing helpers
   ──────────────────────────────────────────────────────── */

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isFieldErrorMap(
  data: unknown,
): data is Record<string, unknown> {
  if (!isPlainObject(data)) return false

  if ('error_code' in data) return false

  const hasFieldKey =
    'title' in data ||
    'content' in data ||
    'category' in data ||
    'image' in data

  if (typeof data.message === 'string' && !hasFieldKey) {
    return false
  }

  return hasFieldKey
}

function extractFieldErrors(data: unknown): FieldErrors {
  const flat: FieldErrors = {}
  if (!isPlainObject(data)) return flat

  const source =
    isPlainObject(data.errors) ? data.errors : data

  for (const k of [
    'title',
    'content',
    'category',
    'image',
  ] as const) {
    const v = source[k]
    if (v == null) continue
    flat[k] = Array.isArray(v) ? v.join(', ') : String(v)
  }

  return flat
}

function asServerError(
  data: unknown,
): ServerErrorPayload | null {
  if (!isPlainObject(data)) return null
  return data as ServerErrorPayload
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

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

  /* ── Image pick ─────────────────────────────
     No size check. Any image is accepted as long
     as the browser reports an image MIME type. */
  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    if (!picked) return

    if (!picked.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
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

  /* ── Submit to /stories/ ──────────────────── */
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
    fd.append('content', content) // HTML string
    fd.append('category', category as string)
    fd.append('image', file as File)

    setSubmitting(true)
    setFieldErrors({})

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/stories/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
          body: fd,
        }
      )

      /* Parse body as `unknown`. */
      const raw: unknown = await res
        .json()
        .catch(() => null)

      if (!res.ok) {
        /* ------------------------------------------------
           1) Field-level errors
           ------------------------------------------------ */
        if (isFieldErrorMap(raw)) {
          const flat = extractFieldErrors(raw)
          if (Object.keys(flat).length > 0) {
            setFieldErrors(flat)
          }

          const payload = asServerError(raw)
          toast.error(
            payload?.message || 'Please fix the highlighted fields.',
            { duration: 4500 }
          )
          return
        }

        /* ------------------------------------------------
           2) Business / limit errors
           ------------------------------------------------ */
        const payload = asServerError(raw)

        const serverMessage =
          payload?.message || payload?.detail

        if (serverMessage) {
          const upgrade = payload?.upgrade_plan
          if (upgrade?.name) {
            toast.error(serverMessage, {
              description: `Upgrade to ${upgrade.name} for more stories.`,
              duration: 7000,
            })
          } else {
            toast.error(serverMessage, { duration: 6000 })
          }
          return
        }

        /* ------------------------------------------------
           3) Fallback
           ------------------------------------------------ */
        throw new Error(
          `Failed to publish story (${res.status}).`
        )
      }

      /* --------------------------------------------------
         Success
         -------------------------------------------------- */
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
                JPG, PNG, or WEBP
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