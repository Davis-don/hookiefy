// SearchPosts.tsx — filter bar + list of stories
import { useEffect, useState } from 'react'
import { FiSearch, FiFilter, FiX } from 'react-icons/fi'
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { useAuthStore } from '../../../../store/authtokenstore'
import Spinner from '../../../../components/Publicspinner/Spinner'
import PostCard from './PostCard'
import './searchposts.css'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

type StoryCategory = 'ideas' | 'success' | 'fun'

type StoryOrdering =
  | '-created_at'
  | 'created_at'
  | 'title'
  | '-title'

interface StoryAuthor {
  id: number
  first_name: string
  last_name: string
  full_name: string
  profile_image_url: string | null
  role: string
}

interface Story {
  id: number
  title: string
  content: string
  category: StoryCategory
  image_url: string | null
  created_at: string
  updated_at?: string
  author: StoryAuthor
}

interface StoriesResponse {
  count: number
  stories: Story[]
}

interface Filters {
  search: string
  category: StoryCategory | ''
  ordering: StoryOrdering
}

/* ────────────────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────────────────── */

const CATEGORY_OPTIONS: {
  value: StoryCategory | ''
  label: string
}[] = [
  { value: '',        label: 'All' },
  { value: 'ideas',   label: 'Ideas & Tips' },
  { value: 'success', label: 'Success Stories' },
  { value: 'fun',     label: 'Fun' },
]

const ORDERING_OPTIONS: {
  value: StoryOrdering
  label: string
}[] = [
  { value: '-created_at', label: 'Newest' },
  { value: 'created_at',  label: 'Oldest' },
  { value: 'title',       label: 'A → Z' },
  { value: '-title',      label: 'Z → A' },
]

/* ────────────────────────────────────────────────────────
   API
   ──────────────────────────────────────────────────────── */

async function fetchStories(
  access: string | null,
  filters: Filters
): Promise<StoriesResponse> {
  const params = new URLSearchParams()

  if (filters.search.trim()) {
    params.set('search', filters.search.trim())
  }
  if (filters.category) {
    params.set('category', filters.category)
  }
  if (filters.ordering) {
    params.set('ordering', filters.ordering)
  }

  const qs = params.toString()
  const url = `${import.meta.env.VITE_API_URL}/stories/${
    qs ? `?${qs}` : ''
  }`

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (access) {
    headers.Authorization = `Bearer ${access}`
  }

  const res = await fetch(url, { headers })
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(
      (data && data.message) || 'Failed to load stories'
    )
  }

  return {
    count: data?.count ?? 0,
    stories: (data?.stories ?? []) as Story[],
  }
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

function SearchPosts() {
  const { access } = useAuthStore()
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<StoryCategory | ''>('')
  const [ordering, setOrdering] =
    useState<StoryOrdering>('-created_at')
  const [filtersOpen, setFiltersOpen] = useState(false)

  /* ── Debounce search input (correct useEffect pattern) ── */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 350)

    return () => clearTimeout(t)
  }, [searchInput])

  /* Build filters object from state */
  const filters: Filters = {
    search: debouncedSearch,
    category,
    ordering,
  }

  /* ── Query ───────────────────────────────────────── */
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery<StoriesResponse, Error>({
    queryKey: ['stories', access, filters],
    queryFn: () => fetchStories(access, filters),
    enabled: true,               // public endpoint — always on
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 1500,
  })

  const list = data?.stories ?? []
  const count = data?.count ?? 0

  /* ── Helpers ─────────────────────────────────────── */
  const clearFilters = () => {
    setSearchInput('')
    setDebouncedSearch('')
    setCategory('')
    setOrdering('-created_at')

    queryClient.invalidateQueries({ queryKey: ['stories'] })
  }

  const hasFilters =
    searchInput.trim() !== '' ||
    category !== '' ||
    ordering !== '-created_at'

  /* ── Render ──────────────────────────────────────── */
  return (
    <div className="sp-root">
      {/* ── Top search + filter bar ─────────────────── */}
      <div className="sp-topbar">
        <div className="sp-search-wrap">
          <FiSearch className="sp-search-icon" />
          <input
            type="search"
            className="sp-search-input"
            placeholder="Search stories…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search stories"
          />
          {searchInput && (
            <button
              type="button"
              className="sp-search-clear"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
            >
              <FiX />
            </button>
          )}
        </div>

        <button
          type="button"
          className={`sp-filter-btn ${
            filtersOpen ? 'sp-filter-btn-open' : ''
          } ${hasFilters ? 'sp-filter-btn-active' : ''}`}
          onClick={() => setFiltersOpen((v) => !v)}
          aria-label="Toggle filters"
          aria-expanded={filtersOpen}
        >
          <FiFilter />
        </button>
      </div>

      {/* ── Expandable filter panel ─────────────────── */}
      {filtersOpen && (
        <div className="sp-filters">
          <div className="sp-filter-group">
            <span className="sp-filter-label">Category</span>
            <div className="sp-pill-row">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value || 'all'}
                  type="button"
                  className={`sp-pill ${
                    category === opt.value ? 'sp-pill-active' : ''
                  }`}
                  onClick={() => setCategory(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sp-filter-group">
            <span className="sp-filter-label">Sort</span>
            <div className="sp-pill-row">
              {ORDERING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`sp-pill ${
                    ordering === opt.value ? 'sp-pill-active' : ''
                  }`}
                  onClick={() => setOrdering(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {hasFilters && (
            <button
              type="button"
              className="sp-clear-btn"
              onClick={clearFilters}
            >
              <FiX /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Meta row ────────────────────────────────── */}
      <div className="sp-meta">
        <span className="sp-meta-count">
          {isFetching && !isLoading
            ? 'Searching…'
            : `${count} ${count === 1 ? 'story' : 'stories'}`}
        </span>

        <button
          type="button"
          className="sp-refresh-btn"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh"
        >
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ── States ──────────────────────────────────── */}
      {isLoading && (
        <div className="sp-loader">
          <Spinner
            message="Loading stories"
            slowMessage="This is taking a bit longer than usual…"
            slowAfter={4000}
          />
        </div>
      )}

      {isError && !isLoading && (
        <div className="sp-state">
          <h3 className="sp-state-title">Couldn’t load stories</h3>
          <p className="sp-state-text">
            {error?.message || 'Please try again in a moment.'}
          </p>
          <button
            type="button"
            className="sp-retry-btn"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && list.length === 0 && (
        <div className="sp-state">
          <h3 className="sp-state-title">No stories found</h3>
          <p className="sp-state-text">
            {hasFilters
              ? 'Try adjusting your filters or search term.'
              : 'No stories have been shared yet.'}
          </p>
          {hasFilters && (
            <button
              type="button"
              className="sp-retry-btn"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Posts list ──────────────────────────────── */}
      {!isLoading && !isError && list.length > 0 && (
        <div className="sp-list">
          {list.map((story) => (
            <PostCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  )
}

export default SearchPosts