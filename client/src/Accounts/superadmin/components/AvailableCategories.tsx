// AvailableCategories.tsx
import { useEffect, useState } from 'react'
import {
  FiPlus,
  FiRefreshCw,
  FiStar,
  FiEye,
  FiEyeOff,
  FiEdit2,
  FiTrash2,
  FiInbox,
  FiSave,
  FiXCircle,
  FiImage,
} from 'react-icons/fi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '../../../store/authtokenstore'
import './availablecategories.css'

/* ── Types ─────────────────────────────────────────── */

interface Category {
  id: number
  name: string
  slug: string
  description: string
  image_url: string | null
  is_active: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
}

interface EditFormState {
  name: string
  description: string
  image_url: string
  is_active: boolean
  is_featured: boolean
}

interface AvailableCategoriesProps {
  onAddClick?: () => void
}

/* ── Fetchers ─────────────────────────────────────── */

async function fetchCategories(
  access: string | null
): Promise<Category[]> {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/services/service-categories/?all=true`,
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

  return (data?.categories ?? []) as Category[]
}

async function updateCategory(
  access: string | null,
  id: number,
  payload: Omit<Partial<EditFormState>, 'image_url'> & {
    image_url?: string | null
  }
) {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/services/service-categories/${id}/`,
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
    throw new Error(
      (data && data.message) || 'Failed to update category'
    )
  }

  return data
}

async function deleteCategory(
  access: string | null,
  id: number
) {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/services/service-categories/${id}/`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${access}` },
    }
  )

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(
      (data && data.message) || 'Failed to delete category'
    )
  }

  return data
}

/* ── Scroll hook: returns true once user has scrolled
      beyond a threshold (i.e. is NOT at the top)      ─── */

function useScrolledPast(threshold = 80) {
  const [passed, setPassed] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const y =
        window.scrollY ||
        document.documentElement.scrollTop ||
        0
      setPassed(y > threshold)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return passed
}

/* ── Component ────────────────────────────────────── */

const AvailableCategories = ({
  onAddClick,
}: AvailableCategoriesProps) => {
  const { access } = useAuthStore()
  const queryClient = useQueryClient()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<EditFormState | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set())

  /* Floating action button visibility */
  const scrolledPast = useScrolledPast(80)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['service-categories'],
    queryFn: () => fetchCategories(access),
    enabled: !!access,
    staleTime: 2 * 60_000,
  })

  const categories = data ?? []

  /* ── Open edit ─────────────────────────────────────── */

  const openEdit = (cat: Category) => {
    setEditingId(cat.id)
    setForm({
      name: cat.name,
      description: cat.description || '',
      image_url: cat.image_url || '',
      is_active: cat.is_active,
      is_featured: cat.is_featured,
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

    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters.', {
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

    setSavingId(id)
    const loadingToast = toast.loading('Saving changes…')

    try {
      await updateCategory(access, id, {
        name: form.name.trim(),
        description: form.description.trim(),
        image_url: form.image_url.trim() || null,
        is_active: form.is_active,
        is_featured: form.is_featured,
      })

      toast.success('Category updated.', {
        duration: 2500,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })

      queryClient.invalidateQueries({
        queryKey: ['service-categories'],
      })

      setBrokenImages((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })

      setEditingId(null)
      setForm(null)
    } catch (err) {
      toast.error('Failed to update category', {
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
    if (!window.confirm('Delete this category permanently?')) return

    setDeletingId(id)
    const loadingToast = toast.loading('Deleting…')

    try {
      await deleteCategory(access, id)

      toast.success('Category deleted.', {
        duration: 2500,
        icon: '🗑️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })

      queryClient.invalidateQueries({
        queryKey: ['service-categories'],
      })
    } catch (err) {
      toast.error('Failed to delete category', {
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

  /* ── Edit field setter ─────────────────────────────── */

  const setField = <K extends keyof EditFormState>(
    key: K,
    value: EditFormState[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  /* ── Close edit on Escape ──────────────────────────── */

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
    <div className="avc-list">
      {/* ── Toolbar ─────────────────────────────────── */}
      <div className="avc-toolbar">
        <div className="avc-toolbar-left">
          <h2 className="avc-toolbar-title">
            {categories.length}{' '}
            {categories.length === 1 ? 'category' : 'categories'}
          </h2>
        </div>

        <div className="avc-toolbar-right">
          <button
            type="button"
            className="avc-icon-btn"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
          >
            <FiRefreshCw
              className={`avc-icon ${
                isFetching ? 'avc-icon-spinning' : ''
              }`}
            />
          </button>

          {onAddClick && (
            <button
              type="button"
              className="avc-add-btn"
              onClick={onAddClick}
            >
              <FiPlus className="avc-add-icon" />
              Add Category
            </button>
          )}
        </div>
      </div>

      {/* ── Loading ─────────────────────────────────── */}
      {isLoading && (
        <div className="avc-state">
          <div className="avc-spinner" />
          <p className="avc-state-text">Loading categories…</p>
        </div>
      )}

      {/* ── Empty ───────────────────────────────────── */}
      {!isLoading && categories.length === 0 && (
        <div className="avc-state">
          <FiInbox className="avc-state-icon" />
          <h3 className="avc-state-title">No categories yet</h3>
          <p className="avc-state-text">
            Create the first category so providers can pick it
            when listing a new service.
          </p>

          {onAddClick && (
            <button
              type="button"
              className="avc-add-btn"
              onClick={onAddClick}
              style={{ marginTop: 8 }}
            >
              <FiPlus className="avc-add-icon" />
              Add Category
            </button>
          )}
        </div>
      )}

      {/* ── Grid ────────────────────────────────────── */}
      {!isLoading && categories.length > 0 && (
        <div className="avc-grid">
          {categories.map((cat) => {
            const isEditing = editingId === cat.id
            const isSaving = savingId === cat.id
            const isDeleting = deletingId === cat.id

            const hasImage =
              !!cat.image_url && !brokenImages.has(cat.id)

            return (
              <article
                key={cat.id}
                className={`avc-card ${
                  !cat.is_active ? 'avc-card-inactive' : ''
                } ${isEditing ? 'avc-card-editing' : ''}`}
              >
                {!isEditing && (
                  <div className="avc-card-icons">
                    <button
                      type="button"
                      className="avc-card-icon-btn"
                      title="Edit"
                      onClick={() => openEdit(cat)}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      className="avc-card-icon-btn avc-card-icon-btn-danger"
                      title="Delete"
                      onClick={() => handleDelete(cat.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <span className="avc-spinner-small" />
                      ) : (
                        <FiTrash2 />
                      )}
                    </button>
                  </div>
                )}

                {!isEditing ? (
                  <>
                    <div className="avc-card-media">
                      {hasImage ? (
                        <img
                          src={cat.image_url as string}
                          alt={cat.name}
                          className="avc-card-image"
                          loading="lazy"
                          onError={() =>
                            setBrokenImages((prev) => {
                              const next = new Set(prev)
                              next.add(cat.id)
                              return next
                            })
                          }
                        />
                      ) : (
                        <div className="avc-card-initial">
                          {cat.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {cat.is_featured && (
                        <span className="avc-badge avc-badge-featured">
                          <FiStar className="avc-badge-icon" />
                          Featured
                        </span>
                      )}

                      {!cat.is_active && (
                        <span className="avc-badge avc-badge-inactive">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="avc-card-body">
                      <h3 className="avc-card-title">{cat.name}</h3>

                      {cat.description && (
                        <p className="avc-card-description">
                          {cat.description}
                        </p>
                      )}

                      <div className="avc-card-meta">
                        <span className="avc-card-meta-item">
                          {cat.is_active ? (
                            <>
                              <FiEye className="avc-meta-icon" /> Active
                            </>
                          ) : (
                            <>
                              <FiEyeOff className="avc-meta-icon" /> Hidden
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="avc-edit-form">
                    <div className="avc-edit-field">
                      <label className="avc-edit-label">Name</label>
                      <input
                        type="text"
                        className="avc-edit-input"
                        value={form?.name || ''}
                        onChange={(e) =>
                          setField('name', e.target.value)
                        }
                        disabled={isSaving}
                        maxLength={100}
                      />
                    </div>

                    <div className="avc-edit-field">
                      <label className="avc-edit-label">
                        Description
                      </label>
                      <textarea
                        className="avc-edit-input avc-edit-textarea"
                        value={form?.description || ''}
                        onChange={(e) =>
                          setField('description', e.target.value)
                        }
                        disabled={isSaving}
                        rows={3}
                        maxLength={500}
                      />
                    </div>

                    <div className="avc-edit-field">
                      <label className="avc-edit-label">
                        <FiImage className="avc-edit-label-icon" />
                        Image URL
                      </label>
                      <input
                        type="url"
                        className="avc-edit-input"
                        placeholder="https://res.cloudinary.com/…/category.jpg"
                        value={form?.image_url || ''}
                        onChange={(e) =>
                          setField('image_url', e.target.value)
                        }
                        disabled={isSaving}
                        maxLength={500}
                      />
                    </div>

                    <div className="avc-edit-toggles">
                      <label className="avc-toggle">
                        <input
                          type="checkbox"
                          checked={form?.is_active || false}
                          onChange={(e) =>
                            setField('is_active', e.target.checked)
                          }
                          disabled={isSaving}
                        />
                        <span
                          className="avc-toggle-box"
                          aria-hidden="true"
                        />
                        <span className="avc-toggle-text">
                          <FiEye className="avc-toggle-icon" />
                          Active
                        </span>
                      </label>

                      <label className="avc-toggle">
                        <input
                          type="checkbox"
                          checked={form?.is_featured || false}
                          onChange={(e) =>
                            setField('is_featured', e.target.checked)
                          }
                          disabled={isSaving}
                        />
                        <span
                          className="avc-toggle-box"
                          aria-hidden="true"
                        />
                        <span className="avc-toggle-text">
                          <FiStar className="avc-toggle-icon" />
                          Featured
                        </span>
                      </label>
                    </div>

                    <div className="avc-edit-actions">
                      <button
                        type="button"
                        className="avc-edit-save"
                        onClick={() => handleSave(cat.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <span className="avc-spinner-small avc-spinner-dark" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <FiSave className="avc-edit-icon" /> Save
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="avc-edit-cancel"
                        onClick={closeEdit}
                        disabled={isSaving}
                      >
                        <FiXCircle className="avc-edit-icon" />
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

      {/* ── Floating action button (mobile) ─────────────
          Slides up from the bottom when the user has
          scrolled. Hides when they return to the top.    */}
      {onAddClick && (
        <button
          type="button"
          className={`avc-fab ${
            scrolledPast ? 'avc-fab-visible' : ''
          }`}
          onClick={onAddClick}
          aria-label="Add Category"
        >
          <FiPlus className="avc-fab-icon" />
          <span className="avc-fab-label">Add Category</span>
        </button>
      )}
    </div>
  )
}

export default AvailableCategories