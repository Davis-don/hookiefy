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
  FiHeart,
  FiInfo,
} from 'react-icons/fi'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import imageCompression from 'browser-image-compression'
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

type ListingType = 'service' | 'product' | 'hookup'

interface FormState {
  listing_type: ListingType
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
  progress: number
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
   Image limits and compression config
   ──────────────────────────────────────────────────────── */

/** Soft cap — anything above this gets compressed before upload. */
const COMPRESS_THRESHOLD_BYTES = 4 * 1024 * 1024 // 4MB

/** Hard cap — files larger than this are rejected outright. */
const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

/** Target size after compression. */
const COMPRESS_TARGET_MB = 4

/** Maximum dimension after compression (width or height). */
const COMPRESS_MAX_DIMENSION = 2400

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
    throw new Error(
      (data && data.message) || 'Failed to load categories'
    )
  }
  return (data?.categories ?? []) as ServiceCategory[]
}

async function createListing(
  access: string | null,
  form: FormState
) {
  if (!access) throw new Error('No access token found.')

  const isHookup = form.listing_type === 'hookup'

  const body: Record<string, unknown> = {
    listing_type: form.listing_type,
    description: form.description.trim(),
    category_id: Number(form.category_id),
    is_active: form.is_active,
  }

  if (form.title.trim()) {
    body.title = form.title.trim()
  }

  if (!isHookup) {
    body.price = form.price
    body.pricing_unit = form.pricing_unit
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
      (data && data.message) || 'Failed to create listing'
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
 * Upload a single file with real progress via XHR.
 */
function uploadSingleImage(
  access: string,
  serviceId: number,
  file: File,
  makeFirstPrimary: boolean,
  onProgress: (percent: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const fd = new FormData()
    fd.append('images', file)

    if (makeFirstPrimary) {
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
        const percent = Math.round(
          (event.loaded / event.total) * 100
        )
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
            (data && data.message) ||
              `Upload failed (${xhr.status})`
          )
        )
      }
    }

    xhr.onerror = () =>
      reject(new Error('Network error during upload.'))
    xhr.onabort = () => reject(new Error('Upload cancelled.'))

    xhr.send(fd)
  })
}

/**
 * Upload images sequentially, one request per file.
 * Reports a single overall progress value to the caller.
 */
async function uploadListingImages(
  access: string | null,
  serviceId: number,
  images: PendingImage[],
  onProgress: (percent: number) => void
): Promise<any[]> {
  if (!access) throw new Error('No access token found.')

  const total = images.length
  const results: any[] = []

  for (let idx = 0; idx < total; idx++) {
    const img = images[idx]

    const data = await uploadSingleImage(
      access,
      serviceId,
      img.file,
      idx === 0, // make_first_primary on the first upload
      (localPercent) => {
        const overall = Math.round(
          ((idx + localPercent / 100) / total) * 100
        )
        onProgress(overall)
      }
    )

    results.push(data)
  }

  onProgress(100)
  return results
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
  const [isProcessingImages, setIsProcessingImages] = useState(false)

  const isHookup = form.listing_type === 'hookup'
  const allowMultipleImages = !isHookup

  /* ── Fetch categories ─────────────────────────────── */
  const { data: categories } = useQuery({
    queryKey: ['service-categories-public', access],
    queryFn: () => fetchCategories(access),
    enabled: !!access,
    staleTime: 5 * 60_000,
  })

  /* Look up the "Hookup" category if it exists */
  const hookupCategory = categories?.find(
    (c) => c.name.trim().toLowerCase() === 'hookup'
  )

  /* ── Create mutation ──────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: async () => {
      setUploadPhase('creating')

      const created = await createListing(access, form)
      const listingId = created?.service?.id

      if (listingId && images.length > 0) {
        setUploadPhase('uploading')

        setImages((prev) =>
          prev.map((i) => ({
            ...i,
            status: 'uploading',
            progress: 0,
          }))
        )

        await uploadListingImages(
          access,
          listingId,
          images,
          (pct) => setUploadPercent(pct)
        )

        setImages((prev) =>
          prev.map((i) => ({
            ...i,
            progress: 100,
            status: 'done',
          }))
        )
      }

      return created
    },
    onSuccess: (data) => {
      toast.success('Listing created successfully.', {
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

      toast.error('Failed to create listing', {
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

  /* ── Switch listing type ──────────────────────────── */
  const handleTypeChange = (type: ListingType) => {
    if (createMutation.isPending) return

    if (type === 'hookup' && images.length > 1) {
      const keep = images[0]
      const toRevoke = images.slice(1)
      toRevoke.forEach((img) => URL.revokeObjectURL(img.previewUrl))

      setImages(
        keep
          ? [
              {
                ...keep,
                isPrimary: true,
                progress: 0,
                status: 'pending',
              },
            ]
          : []
      )

      toast.info('Hookup listings use only one photo.', {
        duration: 2500,
        style: {
          background: '#1a1a2e',
          border: '1px solid #3b82f6',
          color: '#ffffff',
        },
      })
    }

    if (type === 'hookup') {
      setImages((prev) =>
        prev.length > 0
          ? [{ ...prev[0], isPrimary: true }]
          : prev
      )
    }

    setForm((prev) => ({
      ...prev,
      listing_type: type,
      ...(type === 'hookup'
        ? {
            category_id: hookupCategory
              ? hookupCategory.id
              : prev.category_id,
            price: '',
            pricing_unit: 'per_job',
          }
        : {}),
    }))
  }

  /* ── Compress a single file if it's too large ─────── */
  const maybeCompress = async (file: File): Promise<File> => {
    if (file.size <= COMPRESS_THRESHOLD_BYTES) return file

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: COMPRESS_TARGET_MB,
        maxWidthOrHeight: COMPRESS_MAX_DIMENSION,
        useWebWorker: true,
        initialQuality: 0.85,
      })

      // imageCompression returns a Blob — wrap as a File
      return new File([compressed], file.name, {
        type: compressed.type || file.type,
        lastModified: Date.now(),
      })
    } catch {
      // Compression failed — fall back to the original
      return file
    }
  }

  /* ── Image picker ─────────────────────────────────── */
  const handleImagePick = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const incoming = Array.from(files)

    const limited = isHookup ? incoming.slice(0, 1) : incoming

    if (isHookup && incoming.length > 1) {
      toast.info('Hookup listings allow only one photo.', {
        duration: 2500,
        style: {
          background: '#1a1a2e',
          border: '1px solid #3b82f6',
          color: '#ffffff',
        },
      })
    }

    // Filter out obvious non-images and anything above the
    // hard cap. Compression happens next.
    const valid: File[] = []
    for (const file of limited) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image.`)
        continue
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(
          `${file.name} is over ${
            MAX_IMAGE_SIZE_BYTES / (1024 * 1024)
          }MB.`
        )
        continue
      }

      valid.push(file)
    }

    if (valid.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setIsProcessingImages(true)

    const processed: File[] = []
    for (const file of valid) {
      const next = await maybeCompress(file)
      processed.push(next)
    }

    setIsProcessingImages(false)

    const next: PendingImage[] = processed.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      isPrimary: false,
      progress: 0,
      status: 'pending',
    }))

    setImages((prev) => {
      const base = isHookup ? [] : prev

      if (isHookup) {
        prev.forEach((img) => URL.revokeObjectURL(img.previewUrl))
      }

      const combined = [...base, ...next]

      if (
        combined.length > 0 &&
        !combined.some((i) => i.isPrimary)
      ) {
        combined[0] = { ...combined[0], isPrimary: true }
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

      if (
        filtered.length > 0 &&
        !filtered.some((i) => i.isPrimary)
      ) {
        filtered[0] = { ...filtered[0], isPrimary: true }
      }

      return filtered
    })
  }

  const setPrimary = (id: string) => {
    if (createMutation.isPending) return
    if (!allowMultipleImages) return
    setImages((prev) =>
      prev.map((i) => ({ ...i, isPrimary: i.id === id }))
    )
  }

  /* ── Submit ───────────────────────────────────────── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const errors: FieldErrors = {}

    if (!isHookup) {
      if (!form.title.trim() || form.title.trim().length < 3) {
        errors.title = 'Title must be at least 3 characters.'
      }
      if (
        !form.description.trim() ||
        form.description.trim().length < 20
      ) {
        errors.description =
          'Description must be at least 20 characters.'
      }
      if (!form.price || Number(form.price) < 0) {
        errors.price = 'Please enter a valid price.'
      }
    } else {
      if (
        !form.description.trim() ||
        form.description.trim().length < 20
      ) {
        errors.description =
          'Please write at least a couple of sentences about yourself.'
      }
    }

    if (!form.category_id) {
      errors.category_id = isHookup
        ? 'Please choose the Hookup category.'
        : 'Please select a category.'
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

  /* ── Upload overlay ───────────────────────────────── */
  const uploadedCount = images.filter(
    (i) => i.status === 'done'
  ).length
  const totalCount = images.length

  const isWorking = createMutation.isPending
  const overlayMessage =
    uploadPhase === 'uploading'
      ? `Uploading ${isHookup ? 'photo' : 'images'} (${uploadedCount}/${totalCount})`
      : 'Creating your listing'

  /* ── Render ───────────────────────────────────────── */
  return (
    <>
      {/* ── Full-screen overlay ─────────────────────── */}
      {isWorking && (
        <div className="ads-overlay">
          <div className="ads-overlay-card">
            <Spinner
              message={overlayMessage}
              slowMessage="Hang tight — this can take a moment for large files."
              slowAfter={4000}
            />

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
          <form
            className="ads-form"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* ── Listing type ──────────────────────── */}
            <div className="ads-form-group">
              <label className="ads-form-label">
                <FiPackage className="ads-label-icon" /> Listing
                Type <span className="ads-required">*</span>
              </label>
              <div className="ads-type-toggle">
                <label
                  className={`ads-type-option ${
                    form.listing_type === 'service'
                      ? 'ads-type-active'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="listing_type"
                    value="service"
                    checked={form.listing_type === 'service'}
                    onChange={() => handleTypeChange('service')}
                    disabled={isWorking}
                  />
                  <span>Service</span>
                </label>

                <label
                  className={`ads-type-option ${
                    form.listing_type === 'product'
                      ? 'ads-type-active'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="listing_type"
                    value="product"
                    checked={form.listing_type === 'product'}
                    onChange={() => handleTypeChange('product')}
                    disabled={isWorking}
                  />
                  <span>Product</span>
                </label>

                <label
                  className={`ads-type-option ads-type-option-hookup ${
                    form.listing_type === 'hookup'
                      ? 'ads-type-active'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="listing_type"
                    value="hookup"
                    checked={form.listing_type === 'hookup'}
                    onChange={() => handleTypeChange('hookup')}
                    disabled={isWorking}
                  />
                  <span>
                    <FiHeart className="ads-type-icon" />
                    Hookup
                  </span>
                </label>
              </div>
            </div>

            {/* ── Hookup info banner ────────────────── */}
            {isHookup && (
              <div className="ads-hookup-banner">
                <FiHeart className="ads-hookup-icon" />
                <p className="ads-hookup-text">
                  Write a short intro about yourself — who you
                  are, what you enjoy, and the kind of company
                  you're looking for. One photo is enough.
                  Remember to choose the{' '}
                  <strong>Hookup</strong> category below.
                </p>
              </div>
            )}

            {/* ── Title / Intro Line ───────────────── */}
            <div className="ads-form-group">
              <label className="ads-form-label" htmlFor="title">
                {isHookup ? (
                  <>
                    <FiHeart className="ads-label-icon" /> Your
                    Intro Line
                  </>
                ) : (
                  <>
                    <FiTool className="ads-label-icon" /> Title
                  </>
                )}
                {isHookup ? (
                  <span className="ads-optional">Optional</span>
                ) : (
                  <span className="ads-required">*</span>
                )}
              </label>
              <input
                id="title"
                name="title"
                type="text"
                className={`ads-form-input ${
                  fieldErrors.title ? 'ads-input-error' : ''
                }`}
                placeholder={
                  isHookup
                    ? 'e.g. John Doe — Looking for someone to hang out with'
                    : 'e.g. Private Math Tutoring'
                }
                value={form.title}
                onChange={handleChange}
                disabled={isWorking}
                maxLength={255}
              />
              {isHookup && (
                <span className="ads-hint">
                  Leave blank and we'll use your name.
                </span>
              )}
              {fieldErrors.title && (
                <span className="ads-field-error">
                  {fieldErrors.title}
                </span>
              )}
            </div>

            {/* ── Category ─────────────────────────── */}
            <div className="ads-form-group">
              <label
                className="ads-form-label"
                htmlFor="category_id"
              >
                Category <span className="ads-required">*</span>
              </label>
              <select
                id="category_id"
                name="category_id"
                className={`ads-form-input ${
                  fieldErrors.category_id
                    ? 'ads-input-error'
                    : ''
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

              {isHookup && (
                <span className="ads-hookup-category-hint">
                  <FiInfo className="ads-hint-icon" />
                  Please choose the <strong>Hookup</strong>{' '}
                  category so your listing appears in the right
                  place.
                </span>
              )}

              {fieldErrors.category_id && (
                <span className="ads-field-error">
                  {fieldErrors.category_id}
                </span>
              )}
            </div>

            {/* ── Description / About You ──────────── */}
            <div className="ads-form-group">
              <label
                className="ads-form-label"
                htmlFor="description"
              >
                {isHookup ? 'About You' : 'Description'}{' '}
                <span className="ads-required">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                className={`ads-form-input ads-form-textarea ${
                  fieldErrors.description
                    ? 'ads-input-error'
                    : ''
                }`}
                placeholder={
                  isHookup
                    ? "e.g. I'm John Doe, 28, and I'm looking for a girl I can hang out with — grab coffee, watch a movie, or just talk. I'm easygoing, respectful and value good company."
                    : 'Describe what your service includes, what clients should expect, and anything they need to prepare…'
                }
                value={form.description}
                onChange={handleChange}
                disabled={isWorking}
                rows={isHookup ? 6 : 4}
                maxLength={2000}
              />
              <span className="ads-hint">
                {isHookup
                  ? 'Take a moment to describe yourself honestly — this helps you meet the right people.'
                  : 'Give clients a clear picture of what you offer.'}
              </span>
              {fieldErrors.description && (
                <span className="ads-field-error">
                  {fieldErrors.description}
                </span>
              )}
            </div>

            {/* ── Price + Unit ─────────────────────── */}
            {!isHookup && (
              <div className="ads-form-row">
                <div className="ads-form-group">
                  <label
                    className="ads-form-label"
                    htmlFor="price"
                  >
                    <FiDollarSign className="ads-label-icon" />{' '}
                    Price (KES){' '}
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
                    <span className="ads-field-error">
                      {fieldErrors.price}
                    </span>
                  )}
                </div>

                <div className="ads-form-group">
                  <label
                    className="ads-form-label"
                    htmlFor="pricing_unit"
                  >
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
            )}

            {/* ── Images ───────────────────────────── */}
            <div className="ads-form-group">
              <label className="ads-form-label">
                <FiImage className="ads-label-icon" />{' '}
                {isHookup ? 'Your Photo' : 'Images'}
              </label>

              <div className="ads-image-uploader">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple={allowMultipleImages}
                  className="ads-file-hidden"
                  onChange={handleImagePick}
                  disabled={isWorking || isProcessingImages}
                />

                <button
                  type="button"
                  className="ads-pick-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={
                    isWorking ||
                    isProcessingImages ||
                    (isHookup && images.length >= 1)
                  }
                >
                  <FiPlus className="ads-btn-icon" />
                  {isProcessingImages
                    ? 'Optimising…'
                    : isHookup
                    ? images.length > 0
                      ? 'Replace Photo'
                      : 'Add Photo'
                    : 'Add Images'}
                </button>

                {images.length > 0 && (
                  <div
                    className={`ads-image-grid ${
                      isHookup ? 'ads-image-grid-single' : ''
                    }`}
                  >
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className="ads-image-tile"
                      >
                        <img
                          src={img.previewUrl}
                          alt="preview"
                          className="ads-image-preview"
                        />

                        <div className="ads-image-actions">
                          {allowMultipleImages && (
                            <button
                              type="button"
                              className={`ads-image-btn ${
                                img.isPrimary
                                  ? 'ads-image-btn-active'
                                  : ''
                              }`}
                              onClick={() => setPrimary(img.id)}
                              title="Make primary"
                              disabled={isWorking}
                            >
                              <FiStar />
                            </button>
                          )}

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

                        {allowMultipleImages &&
                          img.isPrimary &&
                          img.status !== 'done' && (
                            <span className="ads-image-badge">
                              Primary
                            </span>
                          )}

                        {isHookup && img.status !== 'done' && (
                          <span className="ads-image-badge ads-image-badge-hookup">
                            <FiHeart /> Profile
                          </span>
                        )}

                        {img.status === 'uploading' && (
                          <>
                            <div className="ads-tile-overlay" />
                            <div className="ads-tile-progress">
                              <div className="ads-tile-progress-track">
                                <div
                                  className="ads-tile-progress-fill"
                                  style={{
                                    width: `${img.progress}%`,
                                  }}
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
                  {isHookup
                    ? 'Add one clear photo of yourself. It becomes your profile shot.'
                    : 'Optional. Add up to several photos. Large images are optimised automatically. The first one becomes the cover.'}
                </span>
              </div>
            </div>

            {/* ── Status toggle ────────────────────── */}
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
                <span
                  className="ads-toggle-box"
                  aria-hidden="true"
                />
                <span className="ads-toggle-text">
                  <FiEye className="ads-toggle-icon" />
                  Active (visible to the public)
                </span>
              </label>
            </div>

            {/* ── Actions ──────────────────────────── */}
            <div className="ads-form-actions">
              <button
                type="submit"
                className="ads-save-btn"
                disabled={isWorking || isProcessingImages}
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
                    <FiSave className="ads-btn-icon" />{' '}
                    {isHookup
                      ? 'Publish Hookup'
                      : 'Create Listing'}
                  </>
                )}
              </button>

              <button
                type="button"
                className="ads-cancel-btn"
                onClick={handleCancel}
                disabled={isWorking || isProcessingImages}
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