// AllPlans.tsx — superadmin view of all plans
import { useEffect, useState } from 'react'
import {
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiStar,
  FiZap,
  FiInbox,
  FiSave,
  FiXCircle,
  FiEye,
  FiEyeOff,
} from 'react-icons/fi'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '../../../store/authtokenstore'
import Spinner from '../../../components/Publicspinner/Spinner'
import ConfirmDeleteModal from '../../service_provider/components/ConfirmDeleteModal'
import './allplans.css'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

type AnalyticsLevel = 'basic' | 'advanced'

interface Plan {
  id: number
  name: string
  slug: string
  description: string
  price: string

  services_limit: number | null
  images_per_service: number | null
  stories_per_month: number | null

  profile_images_limit: number

  featured_listing: boolean
  verified_premium_badge: boolean
  priority_visibility: boolean

  analytics_level: AnalyticsLevel
  connection_fee_type: string

  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

interface EditFormState {
  name: string
  slug: string
  description: string
  price: string
  services_limit: string
  images_per_service: string
  stories_per_month: string
  profile_images_limit: string
  featured_listing: boolean
  verified_premium_badge: boolean
  priority_visibility: boolean
  analytics_level: AnalyticsLevel
  connection_fee_type: string
  is_active: boolean
  display_order: string
}

interface AllPlansProps {
  onAddClick?: () => void
}

/* ────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────── */

const KES = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
})

function parseLimit(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

function limitToInput(v: number | null | undefined): string {
  return v === null || v === undefined ? '' : String(v)
}

function planToForm(p: Plan): EditFormState {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description || '',
    price: p.price,
    services_limit: limitToInput(p.services_limit),
    images_per_service: limitToInput(p.images_per_service),
    stories_per_month: limitToInput(p.stories_per_month),
    profile_images_limit: String(p.profile_images_limit ?? 1),
    featured_listing: p.featured_listing,
    verified_premium_badge: p.verified_premium_badge,
    priority_visibility: p.priority_visibility,
    analytics_level: p.analytics_level,
    connection_fee_type: p.connection_fee_type || 'normal',
    is_active: p.is_active,
    display_order: String(p.display_order ?? 0),
  }
}

function formatLimit(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'Unlimited'
  return String(v)
}

/* ────────────────────────────────────────────────────────
   API helpers
   ──────────────────────────────────────────────────────── */

async function fetchPlans(access: string | null): Promise<Plan[]> {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/plans/?ordering=display_order`,
    {
      headers: {
        Authorization: `Bearer ${access}`,
        Accept: 'application/json',
      },
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((data && data.message) || 'Failed to load plans')
  }
  return (data?.plans ?? []) as Plan[]
}

async function updatePlan(
  access: string | null,
  id: number,
  payload: Record<string, unknown>
) {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/plans/${id}/update/`,
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
    const err = new Error(
      (data && (data.message || data.detail)) ||
        'Failed to update plan'
    ) as Error & { fieldErrors?: Record<string, string> }

    if (data?.errors && typeof data.errors === 'object') {
      const flat: Record<string, string> = {}
      for (const [k, v] of Object.entries(data.errors)) {
        flat[k] = Array.isArray(v) ? v.join(', ') : String(v)
      }
      err.fieldErrors = flat
    }
    throw err
  }
  return data
}

async function deletePlan(access: string | null, id: number) {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/plans/${id}/delete/`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${access}` },
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((data && data.message) || 'Failed to delete plan')
  }
  return data
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

const AllPlans = ({ onAddClick }: AllPlansProps) => {
  const { access } = useAuthStore()
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState<Plan | null>(null)
  const [form, setForm] = useState<EditFormState | null>(null)
  const [saving, setSaving] = useState(false)

  const [pendingDelete, setPendingDelete] = useState<Plan | null>(null)

  /* ── Query ────────────────────────────────────────── */
  const {
    data: plans,
    isLoading,
  } = useQuery({
    queryKey: ['plans', access],
    queryFn: () => fetchPlans(access),
    enabled: !!access,
    staleTime: 60_000,
  })

  const list = plans ?? []

  /* ── Update mutation ──────────────────────────────── */
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: Record<string, unknown>
    }) => updatePlan(access, id, payload),
    onSuccess: () => {
      toast.success('Plan updated.', {
        duration: 2500,
        icon: '✅',
        style: {
          background: '#0a0a0a',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setEditing(null)
      setForm(null)
      setSaving(false)
    },
    onError: (err: Error) => {
      toast.error('Failed to update plan', {
        description: err.message,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#0a0a0a',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
      setSaving(false)
    },
  })

  /* ── Delete mutation ──────────────────────────────── */
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePlan(access, id),
    onSuccess: () => {
      toast.success('Plan deleted.', {
        duration: 2500,
        icon: '🗑️',
        style: {
          background: '#0a0a0a',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setPendingDelete(null)
    },
    onError: (err: Error) => {
      toast.error('Failed to delete plan', {
        description: err.message,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#0a0a0a',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
      setPendingDelete(null)
    },
  })

  /* ── Edit open / close ────────────────────────────── */
  const openEdit = (p: Plan) => {
    setEditing(p)
    setForm(planToForm(p))
  }

  const closeEdit = () => {
    if (saving) return
    setEditing(null)
    setForm(null)
  }

  /* ── Field setter ─────────────────────────────────── */
  const setField = <K extends keyof EditFormState>(
    key: K,
    value: EditFormState[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  /* ── Save edit ────────────────────────────────────── */
  const handleSave = () => {
    if (!form || !editing) return

    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters.')
      return
    }
    if (!form.slug.trim()) {
      toast.error('Slug is required.')
      return
    }
    if (Number(form.price) < 0) {
      toast.error('Price cannot be negative.')
      return
    }

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      description: form.description.trim(),
      price: form.price || '0',
      services_limit: parseLimit(form.services_limit),
      images_per_service: parseLimit(form.images_per_service),
      stories_per_month: parseLimit(form.stories_per_month),
      profile_images_limit:
        parseLimit(form.profile_images_limit) ?? 1,
      featured_listing: form.featured_listing,
      verified_premium_badge: form.verified_premium_badge,
      priority_visibility: form.priority_visibility,
      analytics_level: form.analytics_level,
      connection_fee_type:
        form.connection_fee_type.trim() || 'normal',
      is_active: form.is_active,
      display_order: parseLimit(form.display_order) ?? 0,
    }

    updateMutation.mutate({ id: editing.id, payload })
  }

  /* ── Delete ───────────────────────────────────────── */
  const requestDelete = (p: Plan) => setPendingDelete(p)

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteMutation.mutate(pendingDelete.id)
  }

  const cancelDelete = () => {
    if (deleteMutation.isPending) return
    setPendingDelete(null)
  }

  /* ── Escape closes edit ───────────────────────────── */
  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeEdit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, saving])

  /* ══════════════════════════════════════════════════════
     LOADER
     ══════════════════════════════════════════════════════ */
  if (isLoading) {
    return (
      <div className="alp-loader-screen">
        <Spinner
          message="Loading plans"
          slowMessage="This is taking a bit longer than usual…"
          slowAfter={4000}
        />
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <div className="alp-list">
      {/* ── Empty ───────────────────────────────────── */}
      {list.length === 0 && (
        <div className="alp-state">
          <FiInbox className="alp-state-icon" />
          <h3 className="alp-state-title">No plans yet</h3>
          <p className="alp-state-text">
            Create your first plan so providers can subscribe.
          </p>
          {onAddClick && (
            <button
              type="button"
              className="alp-add-btn"
              onClick={onAddClick}
              style={{ marginTop: 8 }}
            >
              Create Plan
            </button>
          )}
        </div>
      )}

      {/* ── Grid ────────────────────────────────────── */}
      {list.length > 0 && (
        <div className="alp-grid">
          {list.map((p) => {
            const isEditing = editing?.id === p.id
            const isSaving = saving && isEditing
            const isDeleting =
              deleteMutation.isPending &&
              pendingDelete?.id === p.id

            return (
              <article
                key={p.id}
                className={`alp-card ${
                  !p.is_active ? 'alp-card-inactive' : ''
                } ${isEditing ? 'alp-card-editing' : ''}`}
              >
                {!isEditing && (
                  <div className="alp-card-icons">
                    <button
                      type="button"
                      className="alp-card-icon-btn"
                      title="Edit"
                      onClick={() => openEdit(p)}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      className="alp-card-icon-btn alp-card-icon-btn-danger"
                      title="Delete"
                      onClick={() => requestDelete(p)}
                      disabled={isDeleting}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                )}

                {!isEditing ? (
                  /* ══════════════════════════════════
                     READ-ONLY CARD
                     ══════════════════════════════════ */
                  <>
                    <div className="alp-card-head">
                      <h3 className="alp-card-name">{p.name}</h3>
                      {p.description && (
                        <p className="alp-card-desc">{p.description}</p>
                      )}
                    </div>

                    <div className="alp-card-price">
                      <span className="alp-card-price-amount">
                        {Number(p.price) === 0
                          ? 'Free'
                          : KES.format(Number(p.price))}
                      </span>
                      <span className="alp-card-price-unit">
                        /month
                      </span>
                    </div>

                    <ul className="alp-card-features">
                      <li className="alp-feature">
                        <FiCheck className="alp-feature-check" />
                        <span>
                          Services:{' '}
                          <strong>
                            {formatLimit(p.services_limit)}
                          </strong>
                        </span>
                      </li>
                      <li className="alp-feature">
                        <FiCheck className="alp-feature-check" />
                        <span>
                          Images per service:{' '}
                          <strong>
                            {formatLimit(p.images_per_service)}
                          </strong>
                        </span>
                      </li>
                      <li className="alp-feature">
                        <FiCheck className="alp-feature-check" />
                        <span>
                          Stories / month:{' '}
                          <strong>
                            {formatLimit(p.stories_per_month)}
                          </strong>
                        </span>
                      </li>
                      <li className="alp-feature">
                        <FiCheck className="alp-feature-check" />
                        <span>
                          Analytics:{' '}
                          <strong>{p.analytics_level}</strong>
                        </span>
                      </li>
                    </ul>

                    <div className="alp-card-flags">
                      {p.featured_listing && (
                        <span className="alp-flag alp-flag-featured">
                          <FiStar /> Featured
                        </span>
                      )}
                      {p.verified_premium_badge && (
                        <span className="alp-flag alp-flag-verified">
                          <FiStar /> Verified
                        </span>
                      )}
                      {p.priority_visibility && (
                        <span className="alp-flag alp-flag-priority">
                          <FiZap /> Priority
                        </span>
                      )}
                    </div>

                    <div className="alp-card-foot">
                      <span
                        className={`alp-status ${
                          p.is_active
                            ? 'alp-status-active'
                            : 'alp-status-inactive'
                        }`}
                      >
                        {p.is_active ? (
                          <>
                            <FiEye className="alp-status-icon" />
                            Active
                          </>
                        ) : (
                          <>
                            <FiEyeOff className="alp-status-icon" />
                            Inactive
                          </>
                        )}
                      </span>
                    </div>
                  </>
                ) : (
                  /* ══════════════════════════════════
                     EDIT MODE
                     ══════════════════════════════════ */
                  <div className="alp-edit-form">
                    <div className="alp-edit-row">
                      <div className="alp-edit-field">
                        <label className="alp-edit-label">
                          Plan Name
                        </label>
                        <input
                          type="text"
                          className="alp-edit-input"
                          value={form?.name || ''}
                          onChange={(e) =>
                            setField('name', e.target.value)
                          }
                          disabled={isSaving}
                          maxLength={50}
                        />
                      </div>

                      <div className="alp-edit-field">
                        <label className="alp-edit-label">
                          Slug
                        </label>
                        <input
                          type="text"
                          className="alp-edit-input"
                          value={form?.slug || ''}
                          onChange={(e) =>
                            setField('slug', e.target.value)
                          }
                          disabled={isSaving}
                          maxLength={50}
                        />
                      </div>
                    </div>

                    <div className="alp-edit-field">
                      <label className="alp-edit-label">
                        Description
                      </label>
                      <textarea
                        className="alp-edit-input alp-edit-textarea"
                        value={form?.description || ''}
                        onChange={(e) =>
                          setField('description', e.target.value)
                        }
                        disabled={isSaving}
                        rows={2}
                        maxLength={1000}
                      />
                    </div>

                    <div className="alp-edit-row">
                      <div className="alp-edit-field">
                        <label className="alp-edit-label">
                          Price (KES)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="alp-edit-input"
                          value={form?.price || ''}
                          onChange={(e) =>
                            setField('price', e.target.value)
                          }
                          disabled={isSaving}
                        />
                      </div>

                      <div className="alp-edit-field">
                        <label className="alp-edit-label">
                          Display Order
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="alp-edit-input"
                          value={form?.display_order || ''}
                          onChange={(e) =>
                            setField('display_order', e.target.value)
                          }
                          disabled={isSaving}
                        />
                      </div>
                    </div>

                    <div className="alp-edit-section-title">
                      Usage Limits
                    </div>

                    <div className="alp-edit-row">
                      <div className="alp-edit-field">
                        <label className="alp-edit-label">
                          Services
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="alp-edit-input"
                          placeholder="Unlimited"
                          value={form?.services_limit || ''}
                          onChange={(e) =>
                            setField(
                              'services_limit',
                              e.target.value
                            )
                          }
                          disabled={isSaving}
                        />
                      </div>

                      <div className="alp-edit-field">
                        <label className="alp-edit-label">
                          Images / Service
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="alp-edit-input"
                          placeholder="Unlimited"
                          value={form?.images_per_service || ''}
                          onChange={(e) =>
                            setField(
                              'images_per_service',
                              e.target.value
                            )
                          }
                          disabled={isSaving}
                        />
                      </div>
                    </div>

                    <div className="alp-edit-row">
                      <div className="alp-edit-field">
                        <label className="alp-edit-label">
                          Stories / Month
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="alp-edit-input"
                          placeholder="Unlimited"
                          value={form?.stories_per_month || ''}
                          onChange={(e) =>
                            setField(
                              'stories_per_month',
                              e.target.value
                            )
                          }
                          disabled={isSaving}
                        />
                      </div>

                      <div className="alp-edit-field">
                        <label className="alp-edit-label">
                          Profile Images
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="alp-edit-input"
                          value={form?.profile_images_limit || ''}
                          onChange={(e) =>
                            setField(
                              'profile_images_limit',
                              e.target.value
                            )
                          }
                          disabled={isSaving}
                        />
                      </div>
                    </div>

                    <div className="alp-edit-row">
                      <div className="alp-edit-field">
                        <label className="alp-edit-label">
                          Analytics
                        </label>
                        <select
                          className="alp-edit-input"
                          value={form?.analytics_level || 'basic'}
                          onChange={(e) =>
                            setField(
                              'analytics_level',
                              e.target
                                .value as AnalyticsLevel
                            )
                          }
                          disabled={isSaving}
                        >
                          <option value="basic">Basic</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>

                    <div className="alp-edit-section-title">
                      Features
                    </div>

                    <div className="alp-edit-flags">
                      <label className="alp-flag-toggle">
                        <input
                          type="checkbox"
                          checked={form?.featured_listing || false}
                          onChange={(e) =>
                            setField(
                              'featured_listing',
                              e.target.checked
                            )
                          }
                          disabled={isSaving}
                        />
                        <span
                          className="alp-flag-box"
                          aria-hidden="true"
                        >
                          <FiCheck />
                        </span>
                        <span>Featured listings</span>
                      </label>

                      <label className="alp-flag-toggle">
                        <input
                          type="checkbox"
                          checked={
                            form?.verified_premium_badge || false
                          }
                          onChange={(e) =>
                            setField(
                              'verified_premium_badge',
                              e.target.checked
                            )
                          }
                          disabled={isSaving}
                        />
                        <span
                          className="alp-flag-box"
                          aria-hidden="true"
                        >
                          <FiCheck />
                        </span>
                        <span>Verified badge</span>
                      </label>

                      <label className="alp-flag-toggle">
                        <input
                          type="checkbox"
                          checked={
                            form?.priority_visibility || false
                          }
                          onChange={(e) =>
                            setField(
                              'priority_visibility',
                              e.target.checked
                            )
                          }
                          disabled={isSaving}
                        />
                        <span
                          className="alp-flag-box"
                          aria-hidden="true"
                        >
                          <FiCheck />
                        </span>
                        <span>Priority visibility</span>
                      </label>
                    </div>

                    <div className="alp-edit-field">
                      <span className="alp-edit-label">Status</span>
                      <label className="alp-toggle">
                        <input
                          type="checkbox"
                          checked={form?.is_active || false}
                          onChange={(e) =>
                            setField('is_active', e.target.checked)
                          }
                          disabled={isSaving}
                        />
                        <span
                          className="alp-toggle-box"
                          aria-hidden="true"
                        />
                        <span className="alp-toggle-text">
                          {form?.is_active
                            ? 'Active — visible to providers'
                            : 'Inactive — hidden'}
                        </span>
                      </label>
                    </div>

                    <div className="alp-edit-actions">
                      <button
                        type="button"
                        className="alp-edit-save"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <span className="alp-spinner-small" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <FiSave className="alp-edit-icon" /> Save
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="alp-edit-cancel"
                        onClick={closeEdit}
                        disabled={isSaving}
                      >
                        <FiXCircle className="alp-edit-icon" />
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

      {/* ── Confirm delete ──────────────────────────── */}
      <ConfirmDeleteModal
        open={!!pendingDelete}
        subject={pendingDelete?.name}
        title="Delete this plan?"
        message="This will permanently remove the plan. Providers on this plan will lose the associated limits and features. This action cannot be undone."
        confirmLabel="Yes, delete"
        cancelLabel="Keep it"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  )
}

export default AllPlans