// AddPlan.tsx — create a new plan (superadmin only)
import { useState } from 'react'
import {
  FiSave,
  FiXCircle,
  FiCheck,
  FiStar,
} from 'react-icons/fi'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '../../../store/authtokenstore'
import './addplan.css'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

type AnalyticsLevel = 'basic' | 'advanced'

interface AddPlanProps {
  onCreated?: () => void
  onCancel?: () => void
}

interface FormState {
  name: string
  slug: string
  description: string
  price: string

  services_limit: string
  images_per_service: string
  posts_limit: string
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

interface FieldErrors {
  name?: string
  slug?: string
  description?: string
  price?: string
  services_limit?: string
  images_per_service?: string
  posts_limit?: string
  stories_per_month?: string
  profile_images_limit?: string
  analytics_level?: string
  connection_fee_type?: string
  display_order?: string
}

/* ────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────── */

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  description: '',
  price: '0',

  services_limit: '',
  images_per_service: '',
  posts_limit: '',
  stories_per_month: '',

  profile_images_limit: '1',

  featured_listing: false,
  verified_premium_badge: false,
  priority_visibility: false,

  analytics_level: 'basic',

  connection_fee_type: 'normal',

  is_active: true,
  display_order: '0',
}

/** Turn "Pro Plan" into "pro-plan" — used to auto-fill slug. */
function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Convert an "" empty string into null (unlimited). */
function parseLimit(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

/* ────────────────────────────────────────────────────────
   Create API call
   ──────────────────────────────────────────────────────── */

async function createPlan(
  access: string | null,
  form: FormState
) {
  if (!access) throw new Error('No access token found.')

  const payload = {
    name: form.name.trim(),
    slug: form.slug.trim().toLowerCase(),
    description: form.description.trim(),
    price: form.price || '0',

    services_limit: parseLimit(form.services_limit),
    images_per_service: parseLimit(form.images_per_service),
    posts_limit: parseLimit(form.posts_limit),
    stories_per_month: parseLimit(form.stories_per_month),

    profile_images_limit:
      parseLimit(form.profile_images_limit) ?? 1,

    featured_listing: form.featured_listing,
    verified_premium_badge: form.verified_premium_badge,
    priority_visibility: form.priority_visibility,

    analytics_level: form.analytics_level,
    connection_fee_type: form.connection_fee_type.trim() || 'normal',

    is_active: form.is_active,
    display_order: parseLimit(form.display_order) ?? 0,
  }

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/plans/create/`,
    {
      method: 'POST',
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
        'Failed to create plan'
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

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

const AddPlan = ({ onCreated, onCancel }: AddPlanProps) => {
  const { access } = useAuthStore()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [slugTouched, setSlugTouched] = useState(false)

  /* ── Create mutation ──────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: () => createPlan(access, form),
    onSuccess: () => {
      toast.success('Plan created successfully.', {
        duration: 3000,
        icon: '✅',
        style: {
          background: '#0a0a0a',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })

      setForm(EMPTY_FORM)
      setFieldErrors({})
      setSlugTouched(false)

      queryClient.invalidateQueries({ queryKey: ['plans'] })

      onCreated?.()
    },
    onError: (err: Error) => {
      const e = err as Error & { fieldErrors?: FieldErrors }
      if (e.fieldErrors) setFieldErrors(e.fieldErrors)

      toast.error('Failed to create plan', {
        description: err.message,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#0a0a0a',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
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

    if (name === 'name') {
      setForm((prev) => ({
        ...prev,
        name: value,
        slug: slugTouched ? prev.slug : slugify(value),
      }))
    } else if (name === 'slug') {
      setSlugTouched(true)
      setForm((prev) => ({ ...prev, slug: value }))
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }))
    }

    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  /* ── Reset ────────────────────────────────────────── */
  const resetForm = () => {
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setSlugTouched(false)
  }

  /* ── Submit ───────────────────────────────────────── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const errors: FieldErrors = {}

    if (!form.name.trim() || form.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.'
    }

    if (!form.slug.trim()) {
      errors.slug = 'Slug is required.'
    }

    if (Number(form.price) < 0) {
      errors.price = 'Price cannot be negative.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      toast.error('Please fix the highlighted fields.', {
        duration: 3000,
        icon: '⚠️',
        style: {
          background: '#0a0a0a',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
      return
    }

    setFieldErrors({})
    createMutation.mutate()
  }

  /* ── Cancel ───────────────────────────────────────── */
  const handleCancel = () => {
    if (createMutation.isPending) return
    resetForm()
    onCancel?.()
  }

  const isWorking = createMutation.isPending

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className="ap-wrapper">
      <form className="ap-form" onSubmit={handleSubmit} noValidate>
        {/* ── Basic details ─────────────────────────── */}
        <section className="ap-section">
          <h3 className="ap-section-title">Basic details</h3>

          <div className="ap-grid">
            <div className="ap-group">
              <label className="ap-label" htmlFor="name">
                Plan Name <span className="ap-required">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className={`ap-input ${
                  fieldErrors.name ? 'ap-input-error' : ''
                }`}
                placeholder="e.g. Starter, Pro, Business"
                value={form.name}
                onChange={handleChange}
                disabled={isWorking}
                maxLength={50}
                autoFocus
              />
              {fieldErrors.name && (
                <span className="ap-field-error">
                  {fieldErrors.name}
                </span>
              )}
            </div>

            <div className="ap-group">
              <label className="ap-label" htmlFor="slug">
                Slug <span className="ap-required">*</span>
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                className={`ap-input ${
                  fieldErrors.slug ? 'ap-input-error' : ''
                }`}
                placeholder="starter"
                value={form.slug}
                onChange={handleChange}
                disabled={isWorking}
                maxLength={50}
              />
              {fieldErrors.slug && (
                <span className="ap-field-error">
                  {fieldErrors.slug}
                </span>
              )}
              <span className="ap-hint">
                Used in URLs. Auto-filled from the name.
              </span>
            </div>

            <div className="ap-group ap-group-full">
              <label className="ap-label" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                className="ap-input ap-textarea"
                placeholder="Short description shown on the pricing page"
                value={form.description}
                onChange={handleChange}
                disabled={isWorking}
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="ap-group">
              <label className="ap-label" htmlFor="price">
                Price (KES) <span className="ap-required">*</span>
              </label>
              <input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                className={`ap-input ${
                  fieldErrors.price ? 'ap-input-error' : ''
                }`}
                value={form.price}
                onChange={handleChange}
                disabled={isWorking}
              />
              {fieldErrors.price && (
                <span className="ap-field-error">
                  {fieldErrors.price}
                </span>
              )}
            </div>

            <div className="ap-group">
              <label className="ap-label" htmlFor="display_order">
                Display Order
              </label>
              <input
                id="display_order"
                name="display_order"
                type="number"
                min="0"
                step="1"
                className="ap-input"
                value={form.display_order}
                onChange={handleChange}
                disabled={isWorking}
              />
              <span className="ap-hint">
                Lower numbers appear first.
              </span>
            </div>
          </div>
        </section>

        {/* ── Usage limits ──────────────────────────── */}
        <section className="ap-section">
          <h3 className="ap-section-title">Usage limits</h3>
          <p className="ap-section-sub">
            Leave a field blank to allow unlimited.
          </p>

          <div className="ap-grid">
            <div className="ap-group">
              <label className="ap-label" htmlFor="services_limit">
                Services Limit
              </label>
              <input
                id="services_limit"
                name="services_limit"
                type="number"
                min="0"
                className="ap-input"
                placeholder="Unlimited"
                value={form.services_limit}
                onChange={handleChange}
                disabled={isWorking}
              />
            </div>

            <div className="ap-group">
              <label
                className="ap-label"
                htmlFor="images_per_service"
              >
                Images Per Service
              </label>
              <input
                id="images_per_service"
                name="images_per_service"
                type="number"
                min="0"
                className="ap-input"
                placeholder="Unlimited"
                value={form.images_per_service}
                onChange={handleChange}
                disabled={isWorking}
              />
            </div>

            <div className="ap-group">
              <label className="ap-label" htmlFor="posts_limit">
                Posts Limit
              </label>
              <input
                id="posts_limit"
                name="posts_limit"
                type="number"
                min="0"
                className="ap-input"
                placeholder="Unlimited"
                value={form.posts_limit}
                onChange={handleChange}
                disabled={isWorking}
              />
            </div>

            <div className="ap-group">
              <label className="ap-label" htmlFor="stories_per_month">
                Stories Per Month
              </label>
              <input
                id="stories_per_month"
                name="stories_per_month"
                type="number"
                min="0"
                className="ap-input"
                placeholder="Unlimited"
                value={form.stories_per_month}
                onChange={handleChange}
                disabled={isWorking}
              />
            </div>

            <div className="ap-group">
              <label
                className="ap-label"
                htmlFor="profile_images_limit"
              >
                Profile Images
              </label>
              <input
                id="profile_images_limit"
                name="profile_images_limit"
                type="number"
                min="0"
                className="ap-input"
                value={form.profile_images_limit}
                onChange={handleChange}
                disabled={isWorking}
              />
            </div>

            <div className="ap-group">
              <label
                className="ap-label"
                htmlFor="analytics_level"
              >
                Analytics Level
              </label>
              <select
                id="analytics_level"
                name="analytics_level"
                className="ap-input"
                value={form.analytics_level}
                onChange={handleChange}
                disabled={isWorking}
              >
                <option value="basic">Basic</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────── */}
        <section className="ap-section">
          <h3 className="ap-section-title">Features</h3>

          <div className="ap-toggles">
            <label className="ap-toggle">
              <input
                type="checkbox"
                name="featured_listing"
                checked={form.featured_listing}
                onChange={handleChange}
                disabled={isWorking}
              />
              <span className="ap-toggle-box" aria-hidden="true">
                <FiCheck />
              </span>
              <span className="ap-toggle-text">
                <FiStar className="ap-toggle-icon" />
                Featured listings
              </span>
            </label>

            <label className="ap-toggle">
              <input
                type="checkbox"
                name="verified_premium_badge"
                checked={form.verified_premium_badge}
                onChange={handleChange}
                disabled={isWorking}
              />
              <span className="ap-toggle-box" aria-hidden="true">
                <FiCheck />
              </span>
              <span className="ap-toggle-text">
                <FiStar className="ap-toggle-icon" />
                Verified premium badge
              </span>
            </label>

            <label className="ap-toggle">
              <input
                type="checkbox"
                name="priority_visibility"
                checked={form.priority_visibility}
                onChange={handleChange}
                disabled={isWorking}
              />
              <span className="ap-toggle-box" aria-hidden="true">
                <FiCheck />
              </span>
              <span className="ap-toggle-text">
                <FiStar className="ap-toggle-icon" />
                Priority visibility
              </span>
            </label>
          </div>
        </section>

        {/* ── Status ────────────────────────────────── */}
        <section className="ap-section">
          <h3 className="ap-section-title">Status</h3>

          <label className="ap-toggle">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              disabled={isWorking}
            />
            <span className="ap-toggle-box" aria-hidden="true">
              <FiCheck />
            </span>
            <span className="ap-toggle-text">
              {form.is_active
                ? 'Active — visible on the pricing page'
                : 'Inactive — hidden from users'}
            </span>
          </label>
        </section>

        {/* ── Actions ───────────────────────────────── */}
        <div className="ap-actions">
          <button
            type="button"
            className="ap-cancel-btn"
            onClick={handleCancel}
            disabled={isWorking}
          >
            <FiXCircle className="ap-btn-icon" /> Cancel
          </button>

          <button
            type="submit"
            className="ap-save-btn"
            disabled={isWorking}
          >
            {isWorking ? (
              <>
                <span className="ap-spinner-small" />
                Creating…
              </>
            ) : (
              <>
                <FiSave className="ap-btn-icon" /> Create Plan
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddPlan