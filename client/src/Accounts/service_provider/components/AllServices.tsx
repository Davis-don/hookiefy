// AllServices.tsx
import { useEffect, useState } from 'react'
import {
  FiPlus,
  FiRefreshCw,
  FiStar,
  FiEdit2,
  FiTrash2,
  FiInbox,
  FiSave,
  FiXCircle,
  FiPackage,
  FiTool,
  FiEye,
  FiEyeOff,
  FiImage,
} from 'react-icons/fi'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '../../../store/authtokenstore'
import ServiceDetailModal from './ServiceDetailModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import Spinner from '../../../components/Publicspinner/Spinner'
import './allservices.css'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

interface ServiceCategory {
  id: number
  name: string
  slug: string
}

interface ServiceImage {
  id: number
  image_url: string
  image_public_id: string
  is_primary: boolean
  display_order: number
}

interface Service {
  id: number
  listing_type: 'service' | 'product'
  title: string
  description: string
  category: ServiceCategory
  price: string
  pricing_unit: string
  images: ServiceImage[]
  primary_image_url: string | null
  image_count: number
  is_active: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
}

interface EditFormState {
  listing_type: 'service' | 'product'
  title: string
  description: string
  category_id: number | ''
  price: string
  pricing_unit: string
  is_active: boolean
}

interface AllServicesProps {
  onAddClick?: () => void
}

const PRICING_UNITS = [
  { value: 'per_hour', label: 'Per Hour' },
  { value: 'per_day', label: 'Per Day' },
  { value: 'per_week', label: 'Per Week' },
  { value: 'per_month', label: 'Per Month' },
  { value: 'per_job', label: 'Per Job' },
  { value: 'per_item', label: 'Per Item' },
]

/* ────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────── */

function formatPrice(price: string, unit: string) {
  const num = Number(price)
  if (Number.isNaN(num)) return '—'
  const unitLabel =
    PRICING_UNITS.find((u) => u.value === unit)?.label ?? ''
  const formatted = `KES ${num.toLocaleString()}`
  return unitLabel ? `${formatted} · ${unitLabel}` : formatted
}

function useScrolledPast(threshold = 80) {
  const [passed, setPassed] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const y =
        window.scrollY || document.documentElement.scrollTop || 0
      setPassed(y > threshold)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return passed
}

/* ────────────────────────────────────────────────────────
   API
   ──────────────────────────────────────────────────────── */

async function fetchServices(
  access: string | null
): Promise<Service[]> {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/services/?mine=true`,
    {
      headers: {
        Authorization: `Bearer ${access}`,
        Accept: 'application/json',
      },
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((data && data.message) || 'Failed to load services')
  }
  return (data?.services ?? []) as Service[]
}

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

async function updateService(
  access: string | null,
  id: number,
  payload: Partial<EditFormState> & { category_id?: number }
) {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/services/${id}/`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((data && data.message) || 'Failed to update service')
  }
  return data
}

async function deleteService(access: string | null, id: number) {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/services/${id}/`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${access}` },
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((data && data.message) || 'Failed to delete service')
  }
  return data
}

async function deleteServiceImage(
  access: string | null,
  serviceId: number,
  imageId: number
) {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/services/${serviceId}/images/${imageId}/`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${access}`,
        Accept: 'application/json',
      },
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(
      (data && data.message) || 'Failed to delete image'
    )
  }
  return data
}

async function setPrimaryImage(
  access: string | null,
  serviceId: number,
  imageId: number
) {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/services/${serviceId}/images/${imageId}/set-primary/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        Accept: 'application/json',
      },
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(
      (data && data.message) || 'Failed to set primary image'
    )
  }
  return data
}

/* ────────────────────────────────────────────────────────
   Card cover
   ──────────────────────────────────────────────────────── */

interface CardCoverProps {
  src: string
  alt: string
  count: number
}

function CardCover({ src, alt, count }: CardCoverProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  return (
    <div className="als-card-media">
      {!errored ? (
        <>
          {!loaded && (
            <div
              className="als-card-media-skeleton"
              aria-hidden="true"
            />
          )}

          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={`als-card-image ${
              loaded
                ? 'als-card-image-loaded'
                : 'als-card-image-loading'
            }`}
            onLoad={() => setLoaded(true)}
            onError={() => {
              setErrored(true)
              setLoaded(true)
            }}
          />
        </>
      ) : (
        <div className="als-card-media-empty">
          <FiImage className="als-card-media-icon" />
        </div>
      )}

      {count > 1 && loaded && !errored && (
        <span className="als-card-image-count">
          <FiImage />
          {count}
        </span>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

const AllServices = ({ onAddClick }: AllServicesProps) => {
  const { access } = useAuthStore()
  const queryClient = useQueryClient()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<EditFormState | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [viewingService, setViewingService] = useState<Service | null>(
    null
  )

  /* Which service (if any) is pending delete confirmation */
  const [pendingDelete, setPendingDelete] = useState<Service | null>(
    null
  )

  /* Image delete confirmation — inside edit mode */
  const [pendingImageDelete, setPendingImageDelete] = useState<{
    service: Service
    image: ServiceImage
  } | null>(null)

  const scrolledPast = useScrolledPast(80)

  const {
    data: services,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['my-services', access],
    queryFn: () => fetchServices(access),
    enabled: !!access,
    staleTime: 60_000,
  })

  const { data: categories } = useQuery({
    queryKey: ['service-categories-public', access],
    queryFn: () => fetchCategories(access),
    enabled: !!access,
    staleTime: 5 * 60_000,
  })

  const list = services ?? []

  /* ── Update mutation ────────────────────────────────── */
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: Partial<EditFormState> & { category_id?: number }
    }) => updateService(access, id, payload),
    onSuccess: () => {
      toast.success('Service updated.', {
        duration: 2500,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })
      queryClient.invalidateQueries({ queryKey: ['my-services'] })
      setEditingId(null)
      setForm(null)
      setSavingId(null)
    },
    onError: (err: Error) => {
      toast.error('Failed to update service', {
        description: err.message,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
      setSavingId(null)
    },
  })

  /* ── Delete listing mutation ────────────────────────── */
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteService(access, id),
    onSuccess: () => {
      toast.success('Service deleted.', {
        duration: 2500,
        icon: '🗑️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })
      queryClient.invalidateQueries({ queryKey: ['my-services'] })
      setPendingDelete(null)
    },
    onError: (err: Error) => {
      toast.error('Failed to delete service', {
        description: err.message,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
    },
  })

  /* ── Delete image mutation ──────────────────────────── */
  const deleteImageMutation = useMutation({
    mutationFn: ({
      serviceId,
      imageId,
    }: {
      serviceId: number
      imageId: number
    }) => deleteServiceImage(access, serviceId, imageId),
    onSuccess: () => {
      toast.success('Photo removed.', {
        duration: 2500,
        icon: '🗑️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })
      queryClient.invalidateQueries({ queryKey: ['my-services'] })
      setPendingImageDelete(null)
    },
    onError: (err: Error) => {
      toast.error('Failed to remove photo', {
        description: err.message,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
      setPendingImageDelete(null)
    },
  })

  /* ── Set primary mutation ───────────────────────────── */
  const setPrimaryMutation = useMutation({
    mutationFn: ({
      serviceId,
      imageId,
    }: {
      serviceId: number
      imageId: number
    }) => setPrimaryImage(access, serviceId, imageId),
    onSuccess: () => {
      toast.success('Cover photo updated.', {
        duration: 2000,
        icon: '⭐',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })
      queryClient.invalidateQueries({ queryKey: ['my-services'] })
    },
    onError: (err: Error) => {
      toast.error('Failed to set cover photo', {
        description: err.message,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
    },
  })

  /* ── Edit open / close ──────────────────────────────── */
  const openEdit = (s: Service) => {
    setEditingId(s.id)
    setForm({
      listing_type: s.listing_type,
      title: s.title,
      description: s.description,
      category_id: s.category?.id ?? '',
      price: s.price,
      pricing_unit: s.pricing_unit,
      is_active: s.is_active,
    })
  }

  const closeEdit = () => {
    if (savingId) return
    setEditingId(null)
    setForm(null)
  }

  /* ── Save listing ───────────────────────────────────── */
  const handleSave = (id: number) => {
    if (!form) return

    if (!form.title.trim() || form.title.trim().length < 3) {
      toast.error('Title must be at least 3 characters.')
      return
    }
    if (
      !form.description.trim() ||
      form.description.trim().length < 20
    ) {
      toast.error('Description must be at least 20 characters.')
      return
    }
    if (!form.category_id) {
      toast.error('Please pick a category.')
      return
    }
    if (!form.price || Number(form.price) < 0) {
      toast.error('Please enter a valid price.')
      return
    }

    setSavingId(id)
    updateMutation.mutate({
      id,
      payload: {
        listing_type: form.listing_type,
        title: form.title.trim(),
        description: form.description.trim(),
        category_id: Number(form.category_id),
        price: form.price,
        pricing_unit: form.pricing_unit,
        is_active: form.is_active,
      },
    })
  }

  /* ── Delete listing ─────────────────────────────────── */
  const requestDelete = (s: Service) => {
    setPendingDelete(s)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteMutation.mutate(pendingDelete.id)
  }

  const cancelDelete = () => {
    if (deleteMutation.isPending) return
    setPendingDelete(null)
  }

  /* ── Delete image ───────────────────────────────────── */
  const requestImageDelete = (
    service: Service,
    image: ServiceImage
  ) => {
    setPendingImageDelete({ service, image })
  }

  const confirmImageDelete = () => {
    if (!pendingImageDelete) return
    deleteImageMutation.mutate({
      serviceId: pendingImageDelete.service.id,
      imageId: pendingImageDelete.image.id,
    })
  }

  const cancelImageDelete = () => {
    if (deleteImageMutation.isPending) return
    setPendingImageDelete(null)
  }

  /* ── Set primary image ──────────────────────────────── */
  const handleSetPrimary = (
    service: Service,
    image: ServiceImage
  ) => {
    if (image.is_primary) return
    setPrimaryMutation.mutate({
      serviceId: service.id,
      imageId: image.id,
    })
  }

  /* ── Field setter ───────────────────────────────────── */
  const setField = <K extends keyof EditFormState>(
    key: K,
    value: EditFormState[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  /* ── Escape closes edit ─────────────────────────────── */
  useEffect(() => {
    if (!editingId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeEdit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, savingId])

  /* ══════════════════════════════════════════════════════
     FULL-PAGE LOADER
     ══════════════════════════════════════════════════════ */
  if (isLoading) {
    return (
      <div className="als-loader-screen">
        <Spinner
          message="Loading your listings"
          slowMessage="This is taking a bit longer than usual…"
          slowAfter={4000}
        />
      </div>
    )
  }

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="als-list">
      {/* ── Toolbar ─────────────────────────────────── */}
      <div className="als-toolbar">
        <div className="als-toolbar-left">
          <h2 className="als-toolbar-title">
            {list.length} {list.length === 1 ? 'listing' : 'listings'}
          </h2>
        </div>

        <div className="als-toolbar-right">
          <button
            type="button"
            className="als-icon-btn"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
          >
            <FiRefreshCw
              className={`als-icon ${
                isFetching ? 'als-icon-spinning' : ''
              }`}
            />
          </button>

          {onAddClick && (
            <button
              type="button"
              className="als-add-btn"
              onClick={onAddClick}
            >
              <FiPlus className="als-add-icon" />
              Add Listing
            </button>
          )}
        </div>
      </div>

      {/* ── Empty ───────────────────────────────────── */}
      {list.length === 0 && (
        <div className="als-state">
          <FiInbox className="als-state-icon" />
          <h3 className="als-state-title">No listings yet</h3>
          <p className="als-state-text">
            Create your first service or product so clients can find
            and book you.
          </p>
          {onAddClick && (
            <button
              type="button"
              className="als-add-btn"
              onClick={onAddClick}
              style={{ marginTop: 8 }}
            >
              <FiPlus className="als-add-icon" />
              Add Listing
            </button>
          )}
        </div>
      )}

      {/* ── Grid ────────────────────────────────────── */}
      {list.length > 0 && (
        <div className="als-grid">
          {list.map((s) => {
            const isEditing = editingId === s.id
            const isSaving = savingId === s.id
            const isDeleting =
              deleteMutation.isPending &&
              pendingDelete?.id === s.id

            return (
              <article
                key={s.id}
                className={`als-card ${
                  !s.is_active ? 'als-card-inactive' : ''
                } ${isEditing ? 'als-card-editing' : ''}`}
              >
                {!isEditing && (
                  <div
                    className="als-card-icons"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="als-card-icon-btn"
                      title="Edit"
                      onClick={() => openEdit(s)}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      className="als-card-icon-btn als-card-icon-btn-danger"
                      title="Delete"
                      onClick={() => requestDelete(s)}
                      disabled={isDeleting}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                )}

                {!isEditing ? (
                  /* ── Clickable card body ──────── */
                  <div
                    className="als-card-clickable"
                    onClick={() => setViewingService(s)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setViewingService(s)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${s.title}`}
                  >
                    {s.primary_image_url ? (
                      <CardCover
                        src={s.primary_image_url}
                        alt={s.title}
                        count={s.image_count}
                      />
                    ) : (
                      <div className="als-card-media als-card-media-empty">
                        <FiImage className="als-card-media-icon" />
                      </div>
                    )}

                    <div className="als-card-body">
                      <div className="als-card-heading">
                        <h3 className="als-card-title">{s.title}</h3>
                        {s.is_featured && (
                          <span className="als-badge als-badge-featured">
                            <FiStar className="als-badge-icon" />
                            Featured
                          </span>
                        )}
                      </div>

                      <div className="als-card-tags">
                        <span
                          className={`als-type-tag als-type-${s.listing_type}`}
                        >
                          {s.listing_type === 'service' ? (
                            <>
                              <FiTool className="als-tag-icon" />
                              Service
                            </>
                          ) : (
                            <>
                              <FiPackage className="als-tag-icon" />
                              Product
                            </>
                          )}
                        </span>

                        {s.category?.name && (
                          <span className="als-card-category">
                            {s.category.name}
                          </span>
                        )}
                      </div>

                      <p className="als-card-description">
                        {s.description}
                      </p>

                      <div className="als-card-foot">
                        <span className="als-card-price">
                          {formatPrice(s.price, s.pricing_unit)}
                        </span>

                        <span
                          className={`als-status ${
                            s.is_active
                              ? 'als-status-active'
                              : 'als-status-inactive'
                          }`}
                        >
                          {s.is_active ? (
                            <>
                              <FiEye className="als-status-icon" />
                              Active
                            </>
                          ) : (
                            <>
                              <FiEyeOff className="als-status-icon" />
                              Hidden
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Edit mode ────────────────── */
                  <div className="als-edit-form">
                    {/* Listing type */}
                    <div className="als-edit-field">
                      <label className="als-edit-label">
                        Listing Type
                      </label>
                      <div className="als-type-toggle">
                        <label
                          className={`als-type-option ${
                            form?.listing_type === 'service'
                              ? 'als-type-active'
                              : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="listing_type"
                            value="service"
                            checked={form?.listing_type === 'service'}
                            onChange={() =>
                              setField('listing_type', 'service')
                            }
                            disabled={isSaving}
                          />
                          <span>Service</span>
                        </label>

                        <label
                          className={`als-type-option ${
                            form?.listing_type === 'product'
                              ? 'als-type-active'
                              : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="listing_type"
                            value="product"
                            checked={form?.listing_type === 'product'}
                            onChange={() =>
                              setField('listing_type', 'product')
                            }
                            disabled={isSaving}
                          />
                          <span>Product</span>
                        </label>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="als-edit-field">
                      <label className="als-edit-label">Title</label>
                      <input
                        type="text"
                        className="als-edit-input"
                        value={form?.title || ''}
                        onChange={(e) =>
                          setField('title', e.target.value)
                        }
                        disabled={isSaving}
                        maxLength={255}
                      />
                    </div>

                    {/* Category */}
                    <div className="als-edit-field">
                      <label className="als-edit-label">Category</label>
                      <select
                        className="als-edit-input"
                        value={form?.category_id ?? ''}
                        onChange={(e) =>
                          setField(
                            'category_id',
                            e.target.value
                              ? Number(e.target.value)
                              : ''
                          )
                        }
                        disabled={isSaving}
                      >
                        <option value="">Select category…</option>
                        {categories?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div className="als-edit-field">
                      <label className="als-edit-label">
                        Description
                      </label>
                      <textarea
                        className="als-edit-input als-edit-textarea"
                        value={form?.description || ''}
                        onChange={(e) =>
                          setField('description', e.target.value)
                        }
                        disabled={isSaving}
                        rows={3}
                        maxLength={2000}
                      />
                    </div>

                    {/* Price + Unit */}
                    <div className="als-edit-row">
                      <div className="als-edit-field">
                        <label className="als-edit-label">
                          Price (KES)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="als-edit-input"
                          value={form?.price || ''}
                          onChange={(e) =>
                            setField('price', e.target.value)
                          }
                          disabled={isSaving}
                        />
                      </div>

                      <div className="als-edit-field">
                        <label className="als-edit-label">
                          Pricing Unit
                        </label>
                        <select
                          className="als-edit-input"
                          value={form?.pricing_unit || 'per_job'}
                          onChange={(e) =>
                            setField('pricing_unit', e.target.value)
                          }
                          disabled={isSaving}
                        >
                          {PRICING_UNITS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Active toggle */}
                    <div className="als-edit-field">
                      <span className="als-edit-label">Status</span>
                      <label className="als-toggle">
                        <input
                          type="checkbox"
                          checked={form?.is_active || false}
                          onChange={(e) =>
                            setField('is_active', e.target.checked)
                          }
                          disabled={isSaving}
                        />
                        <span
                          className="als-toggle-box"
                          aria-hidden="true"
                        />
                        <span className="als-toggle-text">
                          {form?.is_active ? (
                            <>
                              <FiEye className="als-toggle-icon" />
                              Active
                            </>
                          ) : (
                            <>
                              <FiEyeOff className="als-toggle-icon" />
                              Hidden
                            </>
                          )}
                        </span>
                      </label>
                    </div>

                    {/* ══════════════════════════════════
                        PHOTO MANAGEMENT
                       ══════════════════════════════════ */}
                    <div className="als-edit-photos">
                      <div className="als-edit-photos-header">
                        <span className="als-edit-label">
                          Photos ({s.images.length})
                        </span>
                        <span className="als-edit-photos-hint">
                          Tap ★ to make a photo the cover
                        </span>
                      </div>

                      {s.images.length === 0 ? (
                        <div className="als-edit-photos-empty">
                          <FiImage />
                          <span>No photos on this listing</span>
                        </div>
                      ) : (
                        <div className="als-edit-photos-grid">
                          {s.images.map((img) => {
                            const isPrimaryBusy =
                              setPrimaryMutation.isPending &&
                              setPrimaryMutation.variables
                                ?.imageId === img.id
                            const isDeleteBusy =
                              deleteImageMutation.isPending &&
                              pendingImageDelete?.image.id ===
                                img.id

                            return (
                              <div
                                key={img.id}
                                className={`als-edit-photo ${
                                  img.is_primary
                                    ? 'als-edit-photo-primary'
                                    : ''
                                }`}
                              >
                                <img
                                  src={img.image_url}
                                  alt=""
                                  loading="lazy"
                                />

                                {img.is_primary && (
                                  <span className="als-edit-photo-badge">
                                    <FiStar /> Cover
                                  </span>
                                )}

                                <div className="als-edit-photo-actions">
                                  {!img.is_primary && (
                                    <button
                                      type="button"
                                      className="als-edit-photo-btn als-edit-photo-btn-star"
                                      title="Make cover"
                                      onClick={() =>
                                        handleSetPrimary(s, img)
                                      }
                                      disabled={
                                        isPrimaryBusy || isSaving
                                      }
                                    >
                                      {isPrimaryBusy ? (
                                        <span className="als-spinner-small als-spinner-dark" />
                                      ) : (
                                        <FiStar />
                                      )}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="als-edit-photo-btn als-edit-photo-btn-delete"
                                    title="Remove photo"
                                    onClick={() =>
                                      requestImageDelete(s, img)
                                    }
                                    disabled={
                                      isDeleteBusy || isSaving
                                    }
                                  >
                                    {isDeleteBusy ? (
                                      <span className="als-spinner-small" />
                                    ) : (
                                      <FiTrash2 />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="als-edit-actions">
                      <button
                        type="button"
                        className="als-edit-save"
                        onClick={() => handleSave(s.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <span className="als-spinner-small als-spinner-dark" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <FiSave className="als-edit-icon" /> Save
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="als-edit-cancel"
                        onClick={closeEdit}
                        disabled={isSaving}
                      >
                        <FiXCircle className="als-edit-icon" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* ── Mobile FAB ──────────────────────────────── */}
      {onAddClick && (
        <button
          type="button"
          className={`als-fab ${
            scrolledPast ? 'als-fab-visible' : ''
          }`}
          onClick={onAddClick}
          aria-label="Add Listing"
        >
          <FiPlus className="als-fab-icon" />
          <span className="als-fab-label">Add Listing</span>
        </button>
      )}

      {/* ── Service detail modal ────────────────────── */}
      <ServiceDetailModal
        service={viewingService}
        onClose={() => setViewingService(null)}
      />

      {/* ── Confirm delete listing ──────────────────── */}
      <ConfirmDeleteModal
        open={!!pendingDelete}
        subject={pendingDelete?.title}
        title="Delete this listing?"
        message="This will permanently remove the listing and all its photos. This action cannot be undone."
        confirmLabel="Yes, delete"
        cancelLabel="Keep it"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* ── Confirm delete image ────────────────────── */}
      <ConfirmDeleteModal
        open={!!pendingImageDelete}
        title="Remove this photo?"
        message="This photo will be permanently removed from your listing. This action cannot be undone."
        confirmLabel="Yes, remove"
        cancelLabel="Keep it"
        isPending={deleteImageMutation.isPending}
        onConfirm={confirmImageDelete}
        onCancel={cancelImageDelete}
      />
    </div>
  )
}

export default AllServices