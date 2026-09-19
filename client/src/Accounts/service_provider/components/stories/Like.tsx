// Like.tsx — self-contained like button with celebratory animation
import {  useState } from 'react'
import { FiHeart } from 'react-icons/fi'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '../../../../store/authtokenstore'
import './like.css'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */

interface LikeProps {
  postId: number
  userId?: number
  onToggle?: (liked: boolean) => void
  size?: 'sm' | 'md'
  contentType?: 'story' | 'clientservice'
}

interface CheckLikeResponse {
  liked: boolean
  likes_count: number
  like_id: number | null
}

interface ToggleLikeResponse {
  liked: boolean
  likes_count: number
  like_id?: number | null
}

/* ────────────────────────────────────────────────────────
   API
   ──────────────────────────────────────────────────────── */

async function fetchLikeState(
  access: string | null,
  postId: number,
  contentType: string
): Promise<CheckLikeResponse> {
  if (!access) {
    return { liked: false, likes_count: 0, like_id: null }
  }

  const params = new URLSearchParams({
    content_type: contentType,
    object_id: String(postId),
  })

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/engagement/check/?${params.toString()}`,
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
      (data && data.detail) || 'Failed to check like state'
    )
  }

  return {
    liked: !!data?.liked,
    likes_count: data?.likes_count ?? 0,
    like_id: data?.like_id ?? null,
  }
}

async function toggleLike(
  access: string | null,
  postId: number,
  contentType: string,
  currentlyLiked: boolean
): Promise<ToggleLikeResponse> {
  if (!access) {
    throw new Error('You must be logged in to like posts.')
  }

  const method = currentlyLiked ? 'DELETE' : 'POST'
  const url = currentlyLiked
    ? `${import.meta.env.VITE_API_URL}/engagement/unlike/`
    : `${import.meta.env.VITE_API_URL}/engagement/like/`

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      content_type: contentType,
      object_id: postId,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(
      (data && data.detail) || 'Failed to update like'
    )
  }

  return {
    liked: !!data?.liked,
    likes_count: data?.likes_count ?? 0,
    like_id: data?.like_id ?? null,
  }
}

/* ────────────────────────────────────────────────────────
   Celebration particles
   ──────────────────────────────────────────────────────── */

const PARTICLE_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
]

interface Particle {
  id: number
  angle: number
  distance: number
  size: number
  color: string
  delay: number
  duration: number
  shape: 'circle' | 'square'
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    // Spread the angles evenly around the circle
    const baseAngle = (360 / count) * i
    // Add a small jitter so it doesn't look mechanical
    const angle = baseAngle + (Math.random() * 20 - 10)

    return {
      id: i,
      angle,
      distance: 34 + Math.random() * 26,
      size: 5 + Math.random() * 5,
      color:
        PARTICLE_COLORS[
          Math.floor(Math.random() * PARTICLE_COLORS.length)
        ],
      delay: Math.random() * 80,
      duration: 620 + Math.random() * 220,
      shape: Math.random() > 0.5 ? 'circle' : 'square',
    }
  })
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

function Like({
  postId,
  userId,
  onToggle,
  size = 'md',
  contentType = 'story',
}: LikeProps) {
  const { access } = useAuthStore()
  const queryClient = useQueryClient()

  const [pop, setPop] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])

  /* ── Query ───────────────────────────────────────── */
  const { data, isLoading } = useQuery<CheckLikeResponse, Error>({
    queryKey: ['like-state', postId, contentType, access],
    queryFn: () => fetchLikeState(access, postId, contentType),
    enabled: true,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 800,
  })

  const liked = data?.liked ?? false
  const likesCount = data?.likes_count ?? 0

  /* ── Mutation ────────────────────────────────────── */
  const mutation = useMutation<
    ToggleLikeResponse,
    Error,
    { currentlyLiked: boolean },
    { previous: CheckLikeResponse | undefined }
  >({
    mutationFn: ({ currentlyLiked }) =>
      toggleLike(access, postId, contentType, currentlyLiked),

    onMutate: async ({ currentlyLiked }) => {
      await queryClient.cancelQueries({
        queryKey: ['like-state', postId, contentType, access],
      })

      const previous = queryClient.getQueryData<CheckLikeResponse>(
        ['like-state', postId, contentType, access]
      )

      queryClient.setQueryData<CheckLikeResponse>(
        ['like-state', postId, contentType, access],
        {
          liked: !currentlyLiked,
          likes_count: Math.max(
            0,
            (previous?.likes_count ?? 0) + (currentlyLiked ? -1 : 1)
          ),
          like_id: currentlyLiked ? null : previous?.like_id ?? null,
        }
      )

      setPop(true)
      setTimeout(() => setPop(false), 420)

      return { previous }
    },

    onSuccess: (result) => {
      queryClient.setQueryData<CheckLikeResponse>(
        ['like-state', postId, contentType, access],
        {
          liked: result.liked,
          likes_count: result.likes_count,
          like_id: result.like_id ?? null,
        }
      )

      onToggle?.(result.liked)

      // Fire the celebration ONLY when liking (not unliking)
      if (result.liked) {
        setParticles(makeParticles(14))
        setCelebrate(true)
        setTimeout(() => setCelebrate(false), 900)
      }
    },

    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['like-state', postId, contentType, access],
          context.previous
        )
      } else {
        queryClient.invalidateQueries({
          queryKey: ['like-state', postId, contentType, access],
        })
      }

      setPop(false)

      toast.error(
        err.message || 'Could not update like. Please try again.',
        { duration: 3000 }
      )
    },
  })

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    const currentlyLiked = liked

    if (mutation.isPending || isLoading) return

    mutation.mutate({ currentlyLiked })
  }

  return (
    <button
      type="button"
      className={`lk-btn-root lk-btn-root-${size} ${
        liked ? 'lk-btn-root-liked' : ''
      } ${pop ? 'lk-btn-root-pop' : ''}`}
      onClick={handleClick}
      aria-label={liked ? 'Unlike this post' : 'Like this post'}
      aria-pressed={liked}
      disabled={isLoading}
      data-user-id={userId ?? ''}
      data-post-id={postId}
      title={`${likesCount} ${likesCount === 1 ? 'like' : 'likes'}`}
    >
      {/* ── The heart icon itself ─────────────────── */}
      <FiHeart className="lk-btn-icon" />

      {/* ── Celebration particles ─────────────────── */}
      {celebrate && (
        <span className="lk-burst" aria-hidden="true">
          {particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180
            const tx = Math.cos(rad) * p.distance
            const ty = Math.sin(rad) * p.distance

            return (
              <span
                key={p.id}
                className={`lk-particle lk-particle-${p.shape}`}
                style={{
                  '--lk-tx': `${tx}px`,
                  '--lk-ty': `${ty}px`,
                  '--lk-size': `${p.size}px`,
                  '--lk-color': p.color,
                  '--lk-delay': `${p.delay}ms`,
                  '--lk-duration': `${p.duration}ms`,
                } as React.CSSProperties}
              />
            )
          })}
        </span>
      )}
    </button>
  )
}

export default Like