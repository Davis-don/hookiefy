// Userservicesfeed.tsx
import { useEffect, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { FiRefreshCw, FiInbox } from 'react-icons/fi'
import { toast } from 'sonner'
import { useAuthStore } from '../../../store/authtokenstore'
import Userfeedcard from './Userfeedcard'
import Spinner from '../../../components/Publicspinner/Spinner'
import './userservicesfeed.css'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

export interface FeedCategory {
  id: number
  name: string
  slug: string
}

export interface FeedProvider {
  id: number
  full_name: string
  first_name: string
  last_name: string
  role: string
  profile_image_url: string | null
}

export interface FeedUser {
  id: number
  first_name: string
  last_name: string
  country: string | null
  county: string | null
  city: string | null
  role: string
  profile_image_url: string | null
  bio: string | null
  interested_in_gender: string | null
  minimum_age: number | null
  maximum_age: number | null
}

export interface FeedService {
  id: number
  listing_type: 'service' | 'product' | 'hookup'
  title: string
  description: string
  category: FeedCategory | null
  provider: FeedProvider | null
  price: string
  pricing_unit: string
  primary_image_url: string | null
  image_count: number
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface FeedAdvert {
  id: string
  title: string
  description: string
  url: string
  type: string
  public_id: string
  created_at: string
}

export type FeedItem =
  | { type: 'user'; data: FeedUser }
  | { type: 'service'; data: FeedService }
  | { type: 'advert'; data: FeedAdvert }

interface FeedResponse {
  page: number
  page_size: number
  total_items: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
  results: FeedItem[]
}

/* ────────────────────────────────────────────────────────
   Fetch
   ──────────────────────────────────────────────────────── */

const PAGE_SIZE = 10

async function fetchFeed(
  access: string | null,
  page: number
): Promise<FeedResponse> {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/feed/info/?page=${page}&page_size=${PAGE_SIZE}`,
    {
      headers: {
        Authorization: `Bearer ${access}`,
        Accept: 'application/json',
      },
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((data && data.message) || 'Failed to load feed')
  }
  return data as FeedResponse
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

const Userservicesfeed = () => {
  const { access } = useAuthStore()

  /* Sentinel that fires "load more" when it enters the viewport */
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<FeedResponse, Error>({
    queryKey: ['user-feed', access],
    queryFn: ({ pageParam = 1 }) =>
      fetchFeed(access, pageParam as number),
    getNextPageParam: (last) =>
      last.has_next ? last.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!access,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  /* ── Infinite scroll observer ────────────────────── */
  useEffect(() => {
    const node = loadMoreRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (
          first.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          fetchNextPage()
        }
      },
      {
        rootMargin: '600px 0px', // pre-load before hitting bottom
        threshold: 0,
      }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  /* Flatten all pages into one list */
  const items =
    data?.pages.flatMap((p) => p.results) ?? []

  /* ── Loading (first page only) ───────────────────── */
  if (isLoading && !data) {
    return (
      <div className="userfeed-page">
        <div className="userfeed-loader">
          <Spinner
            message="Loading your feed"
            slowMessage="This is taking a bit longer than usual…"
            slowAfter={4000}
          />
        </div>
      </div>
    )
  }

  /* ── Error ───────────────────────────────────────── */
  if (isError) {
    return (
      <div className="userfeed-page">
        <div className="userfeed-state">
          <FiInbox className="userfeed-state-icon" />
          <h3 className="userfeed-state-title">
            Couldn't load your feed
          </h3>
          <p className="userfeed-state-text">
            {error?.message || 'Something went wrong.'}
          </p>
          <button
            type="button"
            className="userfeed-retry-btn"
            onClick={() => {
              toast.info('Retrying…', { duration: 1500 })
              refetch()
            }}
          >
            <FiRefreshCw /> Try again
          </button>
        </div>
      </div>
    )
  }

  /* ── Empty ───────────────────────────────────────── */
  if (items.length === 0) {
    return (
      <div className="userfeed-page">
        <div className="userfeed-state">
          <FiInbox className="userfeed-state-icon" />
          <h3 className="userfeed-state-title">Nothing here yet</h3>
          <p className="userfeed-state-text">
            Once people start posting and joining, you'll see
            them here.
          </p>
        </div>
      </div>
    )
  }

  /* ── Render ──────────────────────────────────────── */
  return (
    <div className="userfeed-page">
      {/* Floating refresh — top right, always available */}
      <button
        type="button"
        className="userfeed-float-refresh"
        onClick={() => refetch()}
        disabled={isFetching && !isFetchingNextPage}
        title="Refresh feed"
        aria-label="Refresh feed"
      >
        <FiRefreshCw
          className={
            isFetching && !isFetchingNextPage
              ? 'userfeed-spin'
              : ''
          }
        />
      </button>

      {/* Posts */}
      <div className="userfeed-cards">
        {items.map((item, idx) => (
          <Userfeedcard
            key={`${item.type}-${
              'id' in item.data ? item.data.id : idx
            }-${idx}`}
            item={item}
          />
        ))}
      </div>

      {/* Sentinel — triggers the next page when scrolled into view */}
      <div ref={loadMoreRef} className="userfeed-sentinel" />

      {/* Loading more indicator */}
      {isFetchingNextPage && (
        <div className="userfeed-load-more">
          <span className="userfeed-load-more-spinner" />
          <span className="userfeed-load-more-text">
            Loading more…
          </span>
        </div>
      )}

      {/* End of feed */}
      {!hasNextPage && items.length > 0 && (
        <div className="userfeed-end">
          <span className="userfeed-end-line" />
          <span className="userfeed-end-text">
            You're all caught up
          </span>
          <span className="userfeed-end-line" />
        </div>
      )}
    </div>
  )
}

export default Userservicesfeed