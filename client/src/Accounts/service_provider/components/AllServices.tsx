// AllServices.tsx
import { useEffect, useRef, useState } from 'react'
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
  FiHeart,
  FiEye,
  FiEyeOff,
  FiImage,
  FiLock,
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

type ListingType = 'service' | 'product' | 'hookup'

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
  listing_type: ListingType
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
  title: string
  description: string
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
  if (Number.isNaN(num) || num === 0) return '—'
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
   API helpers
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

async function updateService(
  access: string | null,
  id: number,
  payload: Partial<EditFormState>
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

function uploadServiceImages(
  access: string | null,
  serviceId: number,
  files: File[],
  makeFirstPrimary: boolean,
  onProgress?: (percent: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!access) {
      reject(new Error('No access token found.'))
      return
    }

    const fd = new FormData()
    files.forEach((file) => {
      fd.append('images', file)
    })

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

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round(
            (event.loaded / event.total) * 100
          )
          onProgress(percent)
        }
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

  /* Which listing is currently being edited */
  const [editingService, setEditingService] = useState<Service | null>(
    null
  )
  const [form, setForm] = useState<EditFormState | null>(null)
  const [saving, setSaving] = useState(false)

  const [viewingService, setViewingService] = useState<Service | null>(
    null
  )

  const [pendingDelete, setPendingDelete] = useState<Service | null>(
    null
  )

  const [pendingImageDelete, setPendingImageDelete] = useState<{
    service: Service
    image: ServiceImage
  } | null>(null)

  const [uploadingForId, setUploadingForId] = useState<number | null>(
    null
  )
  const [uploadPercent, setUploadPercent] = useState(0)

  const editFileInputRef = useRef<HTMLInputElement>(null)

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

  const list = services ?? []

  /* ── Update mutation ────────────────────────────────── */
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: Partial<EditFormState>
    }) => updateService(access, id, payload),
    onSuccess: () => {
      toast.success('Listing updated.', {
        duration: 2500,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })
      queryClient.invalidateQueries({ queryKey: ['my-services'] })
      setEditingService(null)
      setForm(null)
      setSaving(false)
    },
    onError: (err: Error) => {
      toast.error('Failed to update listing', {
        description: err.message,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
      setSaving(false)
    },
  })

  /* ── Delete listing mutation ────────────────────────── */
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteService(access, id),
    onSuccess: () => {
      toast.success('Listing deleted.', {
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
      toast.error('Failed to delete listing', {
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

  /* ── Upload new photos mutation ─────────────────────── */
  const uploadPhotosMutation = useMutation({
    mutationFn: ({
      serviceId,
      files,
      makeFirstPrimary,
    }: {
      serviceId: number
      files: File[]
      makeFirstPrimary: boolean
    }) =>
      uploadServiceImages(
        access,
        serviceId,
        files,
        makeFirstPrimary,
        (pct) => setUploadPercent(pct)
      ),
    onSuccess: () => {
      toast.success('Photo(s) uploaded.', {
        duration: 2500,
        icon: '🖼️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })
      queryClient.invalidateQueries({ queryKey: ['my-services'] })
      setUploadingForId(null)
      setUploadPercent(0)
    },
    onError: (err: Error) => {
      toast.error('Failed to upload photo', {
        description: err.message,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
      setUploadingForId(null)
      setUploadPercent(0)
    },
  })

  /* ── Edit open / close ──────────────────────────────── */
  const openEdit = (s: Service) => {
    setEditingService(s)
    setForm({
      title: s.title,
      description: s.description,
      price: s.price,
      pricing_unit: s.pricing_unit,
      is_active: s.is_active,
    })
  }

  const closeEdit = () => {
    if (saving) return
    setEditingService(null)
    setForm(null)
  }

  /* ── Save listing ───────────────────────────────────── */
  const handleSave = () => {
    if (!form || !editingService) return

    const isHookup = editingService.listing_type === 'hookup'

    if (isHookup) {
      if (
        !form.description.trim() ||
        form.description.trim().length < 20
      ) {
        toast.error(
          'Please write at least a couple of sentences about yourself.'
        )
        return
      }
    } else {
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
      if (!form.price || Number(form.price) < 0) {
        toast.error('Please enter a valid price.')
        return
      }
    }

    setSaving(true)

    /* Only send the fields the user can actually edit.
       Listing type and category stay untouched. */
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      is_active: form.is_active,
    }

    if (!isHookup) {
      payload.price = form.price
      payload.pricing_unit = form.pricing_unit
    }

    updateMutation.mutate({
      id: editingService.id,
      payload: payload as Partial<EditFormState>,
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

  /* ── Add new photos from the edit panel ─────────────── */
  const handleAddPhotos = (
    service: Service,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const serviceIsHookup = service.listing_type === 'hookup'

    /* Hookup enforcement — only one image allowed.
       The user must delete the existing photo first. */
    if (serviceIsHookup && service.images.length >= 1) {
      toast.error(
        'Hookup listings only allow one photo. Remove the current one first.'
      )
      if (editFileInputRef.current) {
        editFileInputRef.current.value = ''
      }
      return
    }

    const incoming = Array.from(files)
    const limited = serviceIsHookup
      ? incoming.slice(0, 1)
      : incoming

    if (serviceIsHookup && incoming.length > 1) {
      toast.info('Hookup listings allow only one photo.', {
        duration: 2500,
        style: {
          background: '#1a1a2e',
          border: '1px solid #3b82f6',
          color: '#ffffff',
        },
      })
    }

    const valid: File[] = []
    for (const file of limited) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`${file.name} is over 8MB.`)
        continue
      }
      valid.push(file)
    }

    if (valid.length === 0) {
      if (editFileInputRef.current) {
        editFileInputRef.current.value = ''
      }
      return
    }

    const makeFirstPrimary = !service.images.some(
      (i) => i.is_primary
    )

    setUploadingForId(service.id)
    setUploadPercent(0)

    uploadPhotosMutation.mutate({
      serviceId: service.id,
      files: valid,
      makeFirstPrimary,
    })

    if (editFileInputRef.current) {
      editFileInputRef.current.value = ''
    }
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
    if (!editingService) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeEdit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingService, saving])

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
            Create your first listing so clients can find you.
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
            const isEditing = editingService?.id === s.id
            const isSaving = saving && isEditing
            const isDeleting =
              deleteMutation.isPending &&
              pendingDelete?.id === s.id
            const isHookup = s.listing_type === 'hookup'

            return (
              <article
                key={s.id}
                className={`als-card ${
                  !s.is_active ? 'als-card-inactive' : ''
                } ${isEditing ? 'als-card-editing' : ''} ${
                  isHookup ? 'als-card-hookup' : ''
                }`}
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
                          {s.listing_type === 'service' && (
                            <>
                              <FiTool className="als-tag-icon" />
                              Service
                            </>
                          )}

                          {s.listing_type === 'product' && (
                            <>
                              <FiPackage className="als-tag-icon" />
                              Product
                            </>
                          )}

                          {s.listing_type === 'hookup' && (
                            <>
                              <FiHeart className="als-tag-icon" />
                              Hookup
                            </>
                          )}
                        </span>

                        {!isHookup && s.category?.name && (
                          <span className="als-card-category">
                            {s.category.name}
                          </span>
                        )}
                      </div>

                      <p className="als-card-description">
                        {s.description}
                      </p>

                      <div className="als-card-foot">
                        {!isHookup ? (
                          <span className="als-card-price">
                            {formatPrice(s.price, s.pricing_unit)}
                          </span>
                        ) : (
                          <span className="als-card-hookup-note">
                            Just here for good company
                          </span>
                        )}

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
                    {/* Locked meta — type + category (read-only) */}
                    <div className="als-edit-locked">
                      <div className="als-edit-locked-row">
                        <span className="als-edit-locked-label">
                          <FiLock className="als-edit-locked-icon" />
                          Listing Type
                        </span>
                        <span
                          className={`als-edit-locked-pill als-edit-locked-pill-${s.listing_type}`}
                        >
                          {s.listing_type === 'service' && (
                            <>
                              <FiTool /> Service
                            </>
                          )}
                          {s.listing_type === 'product' && (
                            <>
                              <FiPackage /> Product
                            </>
                          )}
                          {s.listing_type === 'hookup' && (
                            <>
                              <FiHeart /> Hookup
                            </>
                          )}
                        </span>
                      </div>

                      <div className="als-edit-locked-row">
                        <span className="als-edit-locked-label">
                          <FiLock className="als-edit-locked-icon" />
                          Category
                        </span>
                        <span className="als-edit-locked-value">
                          {s.category?.name || 'Uncategorised'}
                        </span>
                      </div>

                      <p className="als-edit-locked-hint">
                        Listing type and category can't be changed
                        after publishing.
                      </p>
                    </div>

                    {/* Title */}
                    <div className="als-edit-field">
                      <label className="als-edit-label">
                        {isHookup ? 'Intro Line (optional)' : 'Title'}
                      </label>
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

                    {/* Description */}
                    <div className="als-edit-field">
                      <label className="als-edit-label">
                        {isHookup ? 'About You' : 'Description'}
                      </label>
                      <textarea
                        className="als-edit-input als-edit-textarea"
                        value={form?.description || ''}
                        onChange={(e) =>
                          setField('description', e.target.value)
                        }
                        disabled={isSaving}
                        rows={isHookup ? 5 : 3}
                        maxLength={2000}
                        placeholder={
                          isHookup
                            ? "Tell people about yourself and what you're looking for…"
                            : undefined
                        }
                      />
                    </div>

                    {/* Price + Unit — hidden for hookup */}
                    {!isHookup && (
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
                    )}

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
                          {isHookup
                            ? 'Your Photo'
                            : `Photos (${s.images.length})`}
                        </span>

                        <div className="als-edit-photos-actions">
                          {!isHookup && (
                            <span className="als-edit-photos-hint">
                              Tap ★ to make a photo the cover
                            </span>
                          )}

                          <button
                            type="button"
                            className="als-edit-photos-add"
                            onClick={() =>
                              editFileInputRef.current?.click()
                            }
                            disabled={
                              isSaving ||
                              uploadingForId === s.id ||
                              (isHookup && s.images.length >= 1)
                            }
                            title={
                              isHookup && s.images.length >= 1
                                ? 'Remove the current photo first'
                                : 'Add photos'
                            }
                          >
                            {uploadingForId === s.id ? (
                              <>
                                <span className="als-spinner-small als-spinner-dark" />
                                {uploadPercent}%
                              </>
                            ) : (
                              <>
                                <FiPlus />
                                {isHookup ? 'Add Photo' : 'Add Photos'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Hidden multi-file input */}
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple={!isHookup}
                        className="als-edit-photos-file"
                        onChange={(e) => handleAddPhotos(s, e)}
                        disabled={
                          isSaving || uploadingForId === s.id
                        }
                      />

                      {s.images.length === 0 ? (
                        <div className="als-edit-photos-empty">
                          <FiImage />
                          <span>
                            No photos yet — use the button above to
                            add one.
                          </span>
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
                            const hideStar = isHookup

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
                                  {!img.is_primary && !hideStar && (
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

                      {/* Hookup single-photo helper text */}
                      {isHookup && s.images.length >= 1 && (
                        <span className="als-edit-photos-hint als-edit-photos-hint-full">
                          Remove the current photo to upload a new
                          one.
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="als-edit-actions">
                      <button
                        type="button"
                        className="als-edit-save"
                        onClick={handleSave}
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