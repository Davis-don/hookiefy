// AddService.tsx
import { useRef, useState } from 'react'
import {
  FiSave,
  FiXCircle,
  FiTool,
  FiDollarSign,
  FiPackage,
  FiImage,
  FiPlus,
  FiTrash2,
  FiStar,
  FiEye,
  FiCheck,
} from 'react-icons/fi'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '../../../store/authtokenstore'
import Spinner from '../../../components/Publicspinner/Spinner'
import './addservice.css'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

interface ServiceCategory {
  id: number
  name: string
}

interface AddServiceProps {
  onCreated?: () => void
  onCancel?: () => void
}

interface FormState {
  listing_type: 'service' | 'product'
  title: string
  description: string
  category_id: number | ''
  price: string
  pricing_unit: string
  is_active: boolean
}

interface FieldErrors {
  listing_type?: string
  title?: string
  description?: string
  category_id?: string
  price?: string
  pricing_unit?: string
}

interface PendingImage {
  id: string
  file: File
  previewUrl: string
  isPrimary: boolean
  /** 0..100 — only meaningful during upload */
  progress: number
  /** 'pending' | 'uploading' | 'done' | 'failed' */
  status: 'pending' | 'uploading' | 'done' | 'failed'
}

const PRICING_UNITS = [
  { value: 'per_hour', label: 'Per Hour' },
  { value: 'per_day', label: 'Per Day' },
  { value: 'per_week', label: 'Per Week' },
  { value: 'per_month', label: 'Per Month' },
  { value: 'per_job', label: 'Per Job' },
  { value: 'per_item', label: 'Per Item' },
]

const EMPTY_FORM: FormState = {
  listing_type: 'service',
  title: '',
  description: '',
  category_id: '',
  price: '',
  pricing_unit: 'per_job',
  is_active: true,
}

/* ────────────────────────────────────────────────────────
   API helpers
   ──────────────────────────────────────────────────────── */

async function fetchCategories(
  access: string | null
): Promise<ServiceCategory[]> {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/services/service-categories/`,
    {
      headers: {
        Authorization: `Bearer ${access}`,
        Accept: 'application/json',
      },
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((data && data.message) || 'Failed to load categories')
  }
  return (data?.categories ?? []) as ServiceCategory[]
}

async function createListing(
  access: string | null,
  form: FormState
) {
  if (!access) throw new Error('No access token found.')

  const body = {
    listing_type: form.listing_type,
    title: form.title.trim(),
    description: form.description.trim(),
    category_id: Number(form.category_id),
    price: form.price,
    pricing_unit: form.pricing_unit,
    is_active: form.is_active,
  }

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/services/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const err = new Error(
      (data && data.message) || 'Failed to create service'
    ) as Error & { fieldErrors?: FieldErrors }

    if (data?.errors && typeof data.errors === 'object') {
      const flat: FieldErrors = {}
      for (const [field, val] of Object.entries(data.errors)) {
        flat[field as keyof FieldErrors] = Array.isArray(val)
          ? val.join(', ')
          : String(val)
      }
      err.fieldErrors = flat
    }

    throw err
  }

  return data
}

/**
 * Upload all images in a single multipart request while
 * reporting real progress via XMLHttpRequest.
 */
function uploadListingImages(
  access: string | null,
  serviceId: number,
  images: PendingImage[],
  onProgress: (percent: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!access) {
      reject(new Error('No access token found.'))
      return
    }

    const fd = new FormData()
    images.forEach((img) => {
      fd.append('images', img.file)
    })

    const primary = images.find((i) => i.isPrimary)
    if (primary) {
      fd.append('make_first_primary', 'true')
    }

    const xhr = new XMLHttpRequest()

    xhr.open(
      'POST',
      `${import.meta.env.VITE_API_URL}/services/${serviceId}/images/upload/`
    )

    xhr.setRequestHeader('Authorization', `Bearer ${access}`)
    xhr.setRequestHeader('Accept', 'application/json')

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    }

    xhr.onload = () => {
      let data: any = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        data = null
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data)
      } else {
        reject(
          new Error(
            (data && data.message) || `Upload failed (${xhr.status})`
          )
        )
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload.'))
    xhr.onabort = () => reject(new Error('Upload cancelled.'))

    xhr.send(fd)
  })
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

const AddService = ({ onCreated, onCancel }: AddServiceProps) => {
  const { access } = useAuthStore()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [images, setImages] = useState<PendingImage[]>([])
  const [uploadPercent, setUploadPercent] = useState(0)
  const [uploadPhase, setUploadPhase] = useState<
    'idle' | 'creating' | 'uploading'
  >('idle')

  /* ── Fetch categories ─────────────────────────────── */
  const { data: categories } = useQuery({
    queryKey: ['service-categories-public', access],
    queryFn: () => fetchCategories(access),
    enabled: !!access,
    staleTime: 5 * 60_000,
  })

  /* ── Create listing mutation ──────────────────────── */
  const createMutation = useMutation({
    mutationFn: async () => {
      setUploadPhase('creating')

      const created = await createListing(access, form)
      const listingId = created?.service?.id

      if (listingId && images.length > 0) {
        setUploadPhase('uploading')

        // Mark all as pending
        setImages((prev) =>
          prev.map((i) => ({ ...i, status: 'uploading', progress: 0 }))
        )

        await uploadListingImages(access, listingId, images, (pct) => {
          setUploadPercent(pct)

          // Distribute progress across tiles so users see
          // each image moving.
          setImages((prev) =>
            prev.map((img, idx) => {
              // Simple equal distribution — each image moves
              // in a slice of the overall percent.
              const sliceSize = 100 / prev.length
              const sliceStart = sliceSize * idx
              const local = Math.min(
                100,
                Math.max(0, (pct - sliceStart) / sliceSize * 100)
              )
              return {
                ...img,
                progress: Math.round(local),
                status: local >= 100 ? 'done' : 'uploading',
              }
            })
          )
        })

        // Ensure all are marked done
        setImages((prev) =>
          prev.map((i) => ({ ...i, progress: 100, status: 'done' }))
        )
      }

      return created
    },
    onSuccess: (data) => {
      toast.success('Service created successfully.', {
        duration: 3000,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })

      images.forEach((img) => URL.revokeObjectURL(img.previewUrl))

      setForm(EMPTY_FORM)
      setImages([])
      setFieldErrors({})
      setUploadPercent(0)
      setUploadPhase('idle')

      queryClient.invalidateQueries({ queryKey: ['my-services'] })

      void data

      onCreated?.()
    },
    onError: (err: Error) => {
      const e = err as Error & { fieldErrors?: FieldErrors }
      if (e.fieldErrors) setFieldErrors(e.fieldErrors)

      toast.error('Failed to create service', {
        description: err.message,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })

      setUploadPhase('idle')
      setUploadPercent(0)
    },
  })

  /* ── Field change ─────────────────────────────────── */
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  /* ── Image picker ─────────────────────────────────── */
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const next: PendingImage[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`${file.name} is over 8MB.`)
        continue
      }

      next.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isPrimary: false,
        progress: 0,
        status: 'pending',
      })
    }

    setImages((prev) => {
      const combined = [...prev, ...next]
      if (combined.length > 0 && !combined.some((i) => i.isPrimary)) {
        combined[0].isPrimary = true
      }
      return combined
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (id: string) => {
    if (createMutation.isPending) return
    setImages((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)

      const filtered = prev.filter((i) => i.id !== id)

      if (filtered.length > 0 && !filtered.some((i) => i.isPrimary)) {
        filtered[0].isPrimary = true
      }
      return filtered
    })
  }

  const setPrimary = (id: string) => {
    if (createMutation.isPending) return
    setImages((prev) =>
      prev.map((i) => ({ ...i, isPrimary: i.id === id }))
    )
  }

  /* ── Submit ───────────────────────────────────────── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const errors: FieldErrors = {}

    if (!form.title.trim() || form.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters.'
    }
    if (!form.description.trim() || form.description.trim().length < 20) {
      errors.description = 'Description must be at least 20 characters.'
    }
    if (!form.category_id) {
      errors.category_id = 'Please select a category.'
    }
    if (!form.price || Number(form.price) < 0) {
      errors.price = 'Please enter a valid price.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      toast.error('Please fix the highlighted fields.', {
        duration: 3000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
      return
    }

    setFieldErrors({})
    setUploadPercent(0)

    createMutation.mutate()
  }

  /* ── Cancel ───────────────────────────────────────── */
  const handleCancel = () => {
    if (createMutation.isPending) return

    images.forEach((img) => URL.revokeObjectURL(img.previewUrl))
    setImages([])
    setForm(EMPTY_FORM)
    setFieldErrors({})
    onCancel?.()
  }

  /* ── Uploaded count ───────────────────────────────── */
  const uploadedCount = images.filter((i) => i.status === 'done').length
  const totalCount = images.length

  /* ── Overlay spinner ──────────────────────────────── */
  const isWorking = createMutation.isPending
  const overlayMessage =
    uploadPhase === 'uploading'
      ? `Uploading images (${uploadedCount}/${totalCount})`
      : 'Creating your service'

  /* ── Render ───────────────────────────────────────── */
  return (
    <>
      {/* ── Full-screen overlay while creating/uploading ── */}
      {isWorking && (
        <div className="ads-overlay">
          <div className="ads-overlay-card">
            <Spinner
              message={overlayMessage}
              slowMessage="Hang tight — this can take a moment for large files."
              slowAfter={4000}
            />

            {/* Progress bar — only shows during upload phase */}
            {uploadPhase === 'uploading' && (
              <div className="ads-overlay-progress">
                <div className="ads-progress-track">
                  <div
                    className="ads-progress-fill"
                    style={{ width: `${uploadPercent}%` }}
                  />
                </div>
                <span className="ads-progress-label">
                  {uploadPercent}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ads-wrapper">
        <div className="ads-form-container">
          <form className="ads-form" onSubmit={handleSubmit} noValidate>
            {/* Listing type */}
            <div className="ads-form-group">
              <label className="ads-form-label">
                <FiPackage className="ads-label-icon" /> Listing Type{' '}
                <span className="ads-required">*</span>
              </label>
              <div className="ads-type-toggle">
                <label
                  className={`ads-type-option ${
                    form.listing_type === 'service' ? 'ads-type-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="listing_type"
                    value="service"
                    checked={form.listing_type === 'service'}
                    onChange={handleChange}
                    disabled={isWorking}
                  />
                  <span>Service</span>
                </label>

                <label
                  className={`ads-type-option ${
                    form.listing_type === 'product' ? 'ads-type-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="listing_type"
                    value="product"
                    checked={form.listing_type === 'product'}
                    onChange={handleChange}
                    disabled={isWorking}
                  />
                  <span>Product</span>
                </label>
              </div>
            </div>

            {/* Title */}
            <div className="ads-form-group">
              <label className="ads-form-label" htmlFor="title">
                <FiTool className="ads-label-icon" /> Title{' '}
                <span className="ads-required">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                className={`ads-form-input ${
                  fieldErrors.title ? 'ads-input-error' : ''
                }`}
                placeholder="e.g. Private Math Tutoring"
                value={form.title}
                onChange={handleChange}
                disabled={isWorking}
                maxLength={255}
              />
              {fieldErrors.title && (
                <span className="ads-field-error">{fieldErrors.title}</span>
              )}
            </div>

            {/* Category */}
            <div className="ads-form-group">
              <label className="ads-form-label" htmlFor="category_id">
                Category <span className="ads-required">*</span>
              </label>
              <select
                id="category_id"
                name="category_id"
                className={`ads-form-input ${
                  fieldErrors.category_id ? 'ads-input-error' : ''
                }`}
                value={form.category_id}
                onChange={handleChange}
                disabled={isWorking}
              >
                <option value="">Select category…</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldErrors.category_id && (
                <span className="ads-field-error">
                  {fieldErrors.category_id}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="ads-form-group">
              <label className="ads-form-label" htmlFor="description">
                Description <span className="ads-required">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                className={`ads-form-input ads-form-textarea ${
                  fieldErrors.description ? 'ads-input-error' : ''
                }`}
                placeholder="Describe what your service includes…"
                value={form.description}
                onChange={handleChange}
                disabled={isWorking}
                rows={4}
                maxLength={2000}
              />
              {fieldErrors.description && (
                <span className="ads-field-error">
                  {fieldErrors.description}
                </span>
              )}
            </div>

            {/* Price + Unit */}
            <div className="ads-form-row">
              <div className="ads-form-group">
                <label className="ads-form-label" htmlFor="price">
                  <FiDollarSign className="ads-label-icon" /> Price (KES){' '}
                  <span className="ads-required">*</span>
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  className={`ads-form-input ${
                    fieldErrors.price ? 'ads-input-error' : ''
                  }`}
                  placeholder="0.00"
                  value={form.price}
                  onChange={handleChange}
                  disabled={isWorking}
                />
                {fieldErrors.price && (
                  <span className="ads-field-error">{fieldErrors.price}</span>
                )}
              </div>

              <div className="ads-form-group">
                <label className="ads-form-label" htmlFor="pricing_unit">
                  Pricing Unit
                </label>
                <select
                  id="pricing_unit"
                  name="pricing_unit"
                  className="ads-form-input"
                  value={form.pricing_unit}
                  onChange={handleChange}
                  disabled={isWorking}
                >
                  {PRICING_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Images */}
            <div className="ads-form-group">
              <label className="ads-form-label">
                <FiImage className="ads-label-icon" /> Images
              </label>

              <div className="ads-image-uploader">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="ads-file-hidden"
                  onChange={handleImagePick}
                  disabled={isWorking}
                />

                <button
                  type="button"
                  className="ads-pick-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isWorking}
                >
                  <FiPlus className="ads-btn-icon" />
                  Add Images
                </button>

                {images.length > 0 && (
                  <div className="ads-image-grid">
                    {images.map((img) => (
                      <div key={img.id} className="ads-image-tile">
                        <img
                          src={img.previewUrl}
                          alt="preview"
                          className="ads-image-preview"
                        />

                        <div className="ads-image-actions">
                          <button
                            type="button"
                            className={`ads-image-btn ${
                              img.isPrimary ? 'ads-image-btn-active' : ''
                            }`}
                            onClick={() => setPrimary(img.id)}
                            title="Make primary"
                            disabled={isWorking}
                          >
                            <FiStar />
                          </button>
                          <button
                            type="button"
                            className="ads-image-btn ads-image-btn-danger"
                            onClick={() => removeImage(img.id)}
                            title="Remove"
                            disabled={isWorking}
                          >
                            <FiTrash2 />
                          </button>
                        </div>

                        {img.isPrimary && img.status !== 'done' && (
                          <span className="ads-image-badge">Primary</span>
                        )}

                        {/* Per-tile upload progress */}
                        {img.status === 'uploading' && (
                          <>
                            <div className="ads-tile-overlay" />
                            <div className="ads-tile-progress">
                              <div className="ads-tile-progress-track">
                                <div
                                  className="ads-tile-progress-fill"
                                  style={{ width: `${img.progress}%` }}
                                />
                              </div>
                              <span className="ads-tile-progress-label">
                                {img.progress}%
                              </span>
                            </div>
                          </>
                        )}

                        {img.status === 'done' && (
                          <div className="ads-tile-done">
                            <FiCheck />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <span className="ads-hint">
                  Optional. The first uploaded image is used as the cover.
                </span>
              </div>
            </div>

            {/* Active toggle */}
            <div className="ads-form-group">
              <span className="ads-form-label">Status</span>
              <label className="ads-toggle">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  disabled={isWorking}
                />
                <span className="ads-toggle-box" aria-hidden="true" />
                <span className="ads-toggle-text">
                  <FiEye className="ads-toggle-icon" />
                  Active (visible to the public)
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="ads-form-actions">
              <button
                type="submit"
                className="ads-save-btn"
                disabled={isWorking}
              >
                {isWorking ? (
                  <>
                    <span className="ads-spinner-small" />
                    {uploadPhase === 'uploading'
                      ? `Uploading… ${uploadPercent}%`
                      : 'Creating…'}
                  </>
                ) : (
                  <>
                    <FiSave className="ads-btn-icon" /> Create Service
                  </>
                )}
              </button>

              <button
                type="button"
                className="ads-cancel-btn"
                onClick={handleCancel}
                disabled={isWorking}
              >
                <FiXCircle className="ads-btn-icon" /> Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default AddService