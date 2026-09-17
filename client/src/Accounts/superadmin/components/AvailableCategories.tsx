// AvailableCategories.tsx
import {
  FiPlus,
  FiRefreshCw,
  FiStar,
  FiEye,
  FiEyeOff,
  FiEdit2,
  FiTrash2,
  FiInbox,
} from 'react-icons/fi'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore'
import './availablecategories.css'

interface Category {
  id: number
  name: string
  slug: string
  description: string
  image_url: string | null
  display_order: number
  is_active: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
}

interface AvailableCategoriesProps {
  onAddClick?: () => void
}

async function fetchCategories(
  access: string | null
): Promise<Category[]> {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/services/service-categories/?all=true`,
    {
      method: 'GET',
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

const AvailableCategories = ({
  onAddClick,
}: AvailableCategoriesProps) => {
  const { access } = useAuthStore()

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['service-categories'],
    queryFn: () => fetchCategories(access),
    enabled: !!access,
    staleTime: 2 * 60_000,
  })

  const categories = data ?? []

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
              className="sas-btn sas-btn-primary"
              onClick={onAddClick}
            >
              <FiPlus className="sas-btn-icon" />
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
              className="sas-btn sas-btn-primary"
              onClick={onAddClick}
              style={{ marginTop: 8 }}
            >
              <FiPlus className="sas-btn-icon" />
              Add Category
            </button>
          )}
        </div>
      )}

      {/* ── Grid ────────────────────────────────────── */}
      {!isLoading && categories.length > 0 && (
        <div className="avc-grid">
          {categories.map((cat) => (
            <article
              key={cat.id}
              className={`avc-card ${
                !cat.is_active ? 'avc-card-inactive' : ''
              }`}
            >
              {/* Media */}
              <div className="avc-card-media">
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="avc-card-img"
                    loading="lazy"
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

              {/* Body */}
              <div className="avc-card-body">
                <h3 className="avc-card-title">{cat.name}</h3>
                <p className="avc-card-slug">/{cat.slug}</p>

                {cat.description && (
                  <p className="avc-card-description">
                    {cat.description}
                  </p>
                )}

                <div className="avc-card-meta">
                  <span className="avc-card-meta-item">
                    Order: {cat.display_order}
                  </span>
                  <span className="avc-card-meta-dot" />
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

              {/* Actions */}
              <div className="avc-card-actions">
                <button
                  type="button"
                  className="avc-card-action"
                  title="Edit (coming soon)"
                  disabled
                >
                  <FiEdit2 />
                </button>
                <button
                  type="button"
                  className="avc-card-action avc-card-action-danger"
                  title="Delete (coming soon)"
                  disabled
                >
                  <FiTrash2 />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default AvailableCategories