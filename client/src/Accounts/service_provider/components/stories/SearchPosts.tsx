// SearchPosts.tsx — search FAB + refresh FAB + post modal
import { useEffect, useRef, useState } from 'react'
import {
  FiSearch,
  FiX,
  FiSliders,
  FiRefreshCw,
} from 'react-icons/fi'
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { useAuthStore } from '../../../../store/authtokenstore'
import Spinner from '../../../../components/Publicspinner/Spinner'
import PostCard from './PostCard'
import PostDetailModal from './PostDetailModal'
import './searchposts.css'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

type StoryCategory = 'ideas' | 'success' | 'fun'

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

/* ────────────────────────────────────────────────────────
   API
   ──────────────────────────────────────────────────────── */

async function fetchStories(
  access: string | null,
  filters: Filters
): Promise<StoriesResponse> {
  const params = new URLSearchParams()

  if (filters.search.trim()) params.set('search', filters.search.trim())
  if (filters.category) params.set('category', filters.category)

  const qs = params.toString()
  const url = `${import.meta.env.VITE_API_URL}/stories/${
    qs ? `?${qs}` : ''
  }`

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (access) headers.Authorization = `Bearer ${access}`

  const res = await fetch(url, { headers })
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error((data && data.message) || 'Failed to load stories')
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

  /* Applied filters */
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<StoryCategory | ''>('')

  /* Draft state while the overlay is open */
  const [draftSearch, setDraftSearch] = useState('')
  const [draftCategory, setDraftCategory] =
    useState<StoryCategory | ''>('')

  /* Overlay open/close */
  const [searchOpen, setSearchOpen] = useState(false)

  /* Which post is currently open in the modal */
  const [openStory, setOpenStory] = useState<Story | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  /* Debounce applied search */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  /* Sync drafts when the overlay opens */
  useEffect(() => {
    if (searchOpen) {
      setDraftSearch(searchInput)
      setDraftCategory(category)
      setTimeout(() => searchInputRef.current?.focus(), 80)
    }
  }, [searchOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Close on Escape */
  useEffect(() => {
    if (!searchOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [searchOpen])

  /* ── Query ─────────────────────────────────────── */
  const filters: Filters = {
    search: debouncedSearch,
    category,
  }

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
    enabled: true,
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

  /* ── Handlers ──────────────────────────────────── */
  const applyFilters = () => {
    setSearchInput(draftSearch)
    setDebouncedSearch(draftSearch)
    setCategory(draftCategory)
    setSearchOpen(false)
  }

  const resetDrafts = () => {
    setDraftSearch('')
    setDraftCategory('')
  }

  const clearApplied = () => {
    setSearchInput('')
    setDebouncedSearch('')
    setCategory('')
    queryClient.invalidateQueries({ queryKey: ['stories'] })
  }

  const hasAppliedFilters =
    searchInput.trim() !== '' || category !== ''

  /* ── Render ────────────────────────────────────── */
  return (
    <div className="sp-root">
      {/* ── States ─────────────────────────────────── */}
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
            {hasAppliedFilters
              ? 'Try adjusting your filters or search term.'
              : 'No stories have been shared yet.'}
          </p>
          {hasAppliedFilters && (
            <button
              type="button"
              className="sp-retry-btn"
              onClick={clearApplied}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Posts list ─────────────────────────────── */}
      {!isLoading && !isError && list.length > 0 && (
        <div className="sp-list">
          {list.map((story) => (
            <PostCard
              key={story.id}
              story={story}
              onOpen={() => setOpenStory(story)}
            />
          ))}
        </div>
      )}

      {/* ── Refresh FAB (bottom-left) ──────────────── */}
      <button
        type="button"
        className={`sp-refresh-fab ${
          isFetching ? 'sp-refresh-fab-spinning' : ''
        }`}
        onClick={() => refetch()}
        disabled={isFetching}
        aria-label="Refresh stories"
      >
        <FiRefreshCw className="sp-refresh-fab-icon" />
      </button>

      {/* ── Search FAB (bottom-right) ──────────────── */}
      <button
        type="button"
        className={`sp-search-fab ${
          hasAppliedFilters ? 'sp-search-fab-active' : ''
        }`}
        onClick={() => setSearchOpen(true)}
        aria-label="Open search"
      >
        <FiSearch className="sp-search-fab-icon" />

        {hasAppliedFilters && (
          <span className="sp-search-fab-dot" aria-hidden="true" />
        )}
      </button>

      {/* ── Search overlay ─────────────────────────── */}
      {searchOpen && (
        <div
          className="sp-search-overlay"
          onClick={() => setSearchOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Search stories"
        >
          <div
            className="sp-search-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sp-search-row">
              <FiSearch className="sp-search-row-icon" />
              <input
                ref={searchInputRef}
                type="search"
                className="sp-search-row-input"
                placeholder="Search stories…"
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters()
                }}
                aria-label="Search stories"
              />
              {draftSearch && (
                <button
                  type="button"
                  className="sp-search-row-clear"
                  onClick={() => setDraftSearch('')}
                  aria-label="Clear search"
                >
                  <FiX />
                </button>
              )}
              <button
                type="button"
                className="sp-search-row-close"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
              >
                <FiX />
              </button>
            </div>

            <div className="sp-search-group">
              <span className="sp-search-group-label">
                <FiSliders /> Category
              </span>
              <div className="sp-search-pills">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value || 'all'}
                    type="button"
                    className={`sp-search-pill ${
                      draftCategory === opt.value
                        ? 'sp-search-pill-active'
                        : ''
                    }`}
                    onClick={() => setDraftCategory(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sp-search-count">
              Showing <strong>{count}</strong>{' '}
              {count === 1 ? 'story' : 'stories'}
            </div>

            <div className="sp-search-actions">
              <button
                type="button"
                className="sp-search-btn-secondary"
                onClick={resetDrafts}
              >
                Reset
              </button>
              <button
                type="button"
                className="sp-search-btn-primary"
                onClick={applyFilters}
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full post modal ────────────────────────── */}
      <PostDetailModal
        story={openStory}
        onClose={() => setOpenStory(null)}
      />
    </div>
  )
}

export default SearchPosts