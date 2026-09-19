// Like.tsx — self-contained like button with animated heart
import { useState } from 'react'
import { FiHeart } from 'react-icons/fi'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '../../../../store/authtokenstore'
import './like.css'

interface LikeProps {
  postId: number
  /** Optional — will fall back to auth store if not provided */
  userId?: number
  /** Optional initial state */
  initialLiked?: boolean
  /** Optional callback fired after a successful toggle */
  onToggle?: (liked: boolean) => void
  /** Optional — render variant */
  size?: 'sm' | 'md'
}

/* ────────────────────────────────────────────────────────
   API
   ──────────────────────────────────────────────────────── */

async function toggleLike(
  access: string | null,
  postId: number,
  liked: boolean
): Promise<{ liked: boolean; count?: number }> {
  if (!access) throw new Error('You must be logged in to like posts.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/stories/${postId}/like/`,
    {
      method: liked ? 'DELETE' : 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        Accept: 'application/json',
      },
    }
  )

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(
      (data && data.message) || 'Failed to update like'
    )
  }

  return {
    liked: !liked,
    count: data?.like_count,
  }
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

function Like({
  postId,
  userId,
  initialLiked = false,
  onToggle,
  size = 'md',
}: LikeProps) {
  const { access } = useAuthStore()
  const queryClient = useQueryClient()
  const [liked, setLiked] = useState(initialLiked)
  const [pop, setPop] = useState(false)

  const mutation = useMutation({
    mutationFn: (nextLiked: boolean) =>
      toggleLike(access, postId, nextLiked),

    onMutate: async (nextLiked) => {
      // Optimistic update — flip immediately
      setLiked(nextLiked)
      setPop(true)
      setTimeout(() => setPop(false), 420)
    },

    onSuccess: (result) => {
      setLiked(result.liked)
      onToggle?.(result.liked)

      // Refresh feed caches so counts stay in sync
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      queryClient.invalidateQueries({ queryKey: ['my-stories'] })
    },

    onError: (err: Error, prevLiked) => {
      // Roll back on failure
      setLiked(!prevLiked)
      setPop(false)
      toast.error(
        err.message || 'Could not update like. Please try again.',
        { duration: 3000 }
      )
    },
  })

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (mutation.isPending) return
    // If not authenticated, still let the store's `access` empty-check
    // throw — the mutation error handler will toast it.
    mutation.mutate(liked)
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
      disabled={mutation.isPending && !liked}
      data-user-id={userId ?? ''}
      data-post-id={postId}
    >
      <FiHeart className="lk-btn-icon" />
    </button>
  )
}

export default Like