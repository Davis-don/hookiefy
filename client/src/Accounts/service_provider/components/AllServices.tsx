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
  FiMapPin,
} from 'react-icons/fi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '../../../store/authtokenstore'
import './allservices.css'

/* ── Types ─────────────────────────────────────────── */

interface ServiceCategory {
  id: number
  name: string
  slug: string
}

interface Service {
  id: number
  title: string
  slug: string
  description: string
  category: ServiceCategory
  price: string
  currency: string
  pricing_unit: string
  location: string
  is_active: boolean
  is_featured: boolean
}

interface EditFormState {
  title: string
  description: string
  category_id: number | ''
  price: string
  currency: string
  pricing_unit: string
  location: string
  is_active: boolean
}

interface AllServicesProps {
  onAddClick?: () => void
}

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP']

const PRICING_UNITS = [
  { value: 'per_hour', label: 'Per Hour' },
  { value: 'per_day', label: 'Per Day' },
  { value: 'per_week', label: 'Per Week' },
  { value: 'per_month', label: 'Per Month' },
  { value: 'per_job', label: 'Per Job' },
]

/* ── Fetchers ─────────────────────────────────────── */

async function fetchServices(access: string | null): Promise<Service[]> {
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

async function fetchCategories(access: string | null): Promise<ServiceCategory[]> {
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

/* ── Formatting ───────────────────────────────────── */

function formatPrice(price: string, currency: string, unit: string) {
  const num = Number(price)
  if (Number.isNaN(num)) return '—'
  const unitLabel =
    PRICING_UNITS.find((u) => u.value === unit)?.label || unit
  return `${currency} ${num.toLocaleString()} · ${unitLabel}`
}

/* ── Scroll hook ──────────────────────────────────── */

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

/* ── Component ────────────────────────────────────── */

const AllServices = ({ onAddClick }: AllServicesProps) => {
  const { access } = useAuthStore()
  const queryClient = useQueryClient()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<EditFormState | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

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

  /* ── Edit open / close ─────────────────────────────── */

  const openEdit = (s: Service) => {
    setEditingId(s.id)
    setForm({
      title: s.title,
      description: s.description,
      category_id: s.category?.id ?? '',
      price: s.price,
      currency: s.currency,
      pricing_unit: s.pricing_unit,
      location: s.location || '',
      is_active: s.is_active,
    })
  }

  const closeEdit = () => {
    if (savingId) return
    setEditingId(null)
    setForm(null)
  }

  /* ── Save ──────────────────────────────────────────── */

  const handleSave = async (id: number) => {
    if (!form) return

    if (!form.title.trim()) {
      toast.error('Title is required.')
      return
    }
    if (!form.category_id) {
      toast.error('Please pick a category.')
      return
    }

    setSavingId(id)
    const loadingToast = toast.loading('Saving changes…')

    try {
      await updateService(access, id, {
        title: form.title.trim(),
        description: form.description.trim(),
        category_id: Number(form.category_id),
        price: form.price,
        currency: form.currency,
        pricing_unit: form.pricing_unit,
        location: form.location.trim(),
        is_active: form.is_active,
      })

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
    } catch (err) {
      toast.error('Failed to update service', {
        description: err instanceof Error ? err.message : undefined,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
    } finally {
      toast.dismiss(loadingToast)
      setSavingId(null)
    }
  }

  /* ── Delete ────────────────────────────────────────── */

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this service permanently?')) return

    setDeletingId(id)
    const loadingToast = toast.loading('Deleting…')

    try {
      await deleteService(access, id)
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
    } catch (err) {
      toast.error('Failed to delete service', {
        description: err instanceof Error ? err.message : undefined,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
    } finally {
      toast.dismiss(loadingToast)
      setDeletingId(null)
    }
  }

  /* ── Field setter ──────────────────────────────────── */

  const setField = <K extends keyof EditFormState>(
    key: K,
    value: EditFormState[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  /* ── Escape closes edit ────────────────────────────── */

  useEffect(() => {
    if (!editingId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeEdit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, savingId])

  /* ── Render ────────────────────────────────────────── */

  return (
    <div className="als-list">
      {/* Toolbar */}
      <div className="als-toolbar">
        <div className="als-toolbar-left">
          <h2 className="als-toolbar-title">
            {list.length} {list.length === 1 ? 'service' : 'services'}
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
              Add Service
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="als-state">
          <div className="als-spinner" />
          <p className="als-state-text">Loading services…</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && list.length === 0 && (
        <div className="als-state">
          <FiInbox className="als-state-icon" />
          <h3 className="als-state-title">No services yet</h3>
          <p className="als-state-text">
            Create your first service so clients can find and book
            you.
          </p>
          {onAddClick && (
            <button
              type="button"
              className="als-add-btn"
              onClick={onAddClick}
              style={{ marginTop: 8 }}
            >
              <FiPlus className="als-add-icon" />
              Add Service
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {!isLoading && list.length > 0 && (
        <div className="als-grid">
          {list.map((s) => {
            const isEditing = editingId === s.id
            const isSaving = savingId === s.id
            const isDeleting = deletingId === s.id

            return (
              <article
                key={s.id}
                className={`als-card ${
                  !s.is_active ? 'als-card-inactive' : ''
                } ${isEditing ? 'als-card-editing' : ''}`}
              >
                {!isEditing && (
                  <div className="als-card-icons">
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
                      onClick={() => handleDelete(s.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <span className="als-spinner-small" />
                      ) : (
                        <FiTrash2 />
                      )}
                    </button>
                  </div>
                )}

                {!isEditing ? (
                  <>
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

                      {s.category?.name && (
                        <span className="als-card-category">
                          {s.category.name}
                        </span>
                      )}

                      <p className="als-card-description">
                        {s.description}
                      </p>

                      <div className="als-card-foot">
                        <span className="als-card-price">
                          {formatPrice(
                            s.price,
                            s.currency,
                            s.pricing_unit
                          )}
                        </span>

                        {s.location && (
                          <span className="als-card-location">
                            <FiMapPin className="als-location-icon" />
                            {s.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="als-edit-form">
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
                      />
                    </div>

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
                      />
                    </div>

                    <div className="als-edit-row">
                      <div className="als-edit-field">
                        <label className="als-edit-label">Price</label>
                        <input
                          type="number"
                          min="0"
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
                          Currency
                        </label>
                        <select
                          className="als-edit-input"
                          value={form?.currency || 'KES'}
                          onChange={(e) =>
                            setField('currency', e.target.value)
                          }
                          disabled={isSaving}
                        >
                          {CURRENCIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="als-edit-row">
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

                      <div className="als-edit-field">
                        <label className="als-edit-label">
                          Location
                        </label>
                        <input
                          type="text"
                          className="als-edit-input"
                          value={form?.location || ''}
                          onChange={(e) =>
                            setField('location', e.target.value)
                          }
                          disabled={isSaving}
                        />
                      </div>
                    </div>

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

      {/* Mobile FAB */}
      {onAddClick && (
        <button
          type="button"
          className={`als-fab ${
            scrolledPast ? 'als-fab-visible' : ''
          }`}
          onClick={onAddClick}
          aria-label="Add Service"
        >
          <FiPlus className="als-fab-icon" />
          <span className="als-fab-label">Add Service</span>
        </button>
      )}
    </div>
  )
}

export default AllServices