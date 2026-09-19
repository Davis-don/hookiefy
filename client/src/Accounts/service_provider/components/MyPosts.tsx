// MyPosts.tsx — user's own stories from /stories/?mine=true
import { useState } from 'react'
import {
  FiRefreshCw,
  FiEdit2,
  FiTrash2,
  FiInbox,
  FiX,
  FiSave,
  FiXCircle,
  FiTag,
  FiImage,
  FiAlertTriangle,
} from 'react-icons/fi'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '../../../store/authtokenstore'
import Spinner from '../../../components/Publicspinner/Spinner'
import './myposts.css'

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

interface EditFormState {
  title: string
  content: string
  category: StoryCategory
}

/* ────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────── */

const CATEGORY_LABELS: Record<StoryCategory, string> = {
  ideas: 'Ideas & Tips',
  success: 'Success Stories',
  fun: 'Fun',
}

const CATEGORY_OPTIONS: { value: StoryCategory; label: string }[] = [
  { value: 'ideas',   label: 'Ideas & Tips' },
  { value: 'success', label: 'Success Stories' },
  { value: 'fun',     label: 'Fun' },
]

function initials(first?: string, last?: string) {
  const f = (first || '?').charAt(0).toUpperCase()
  const l = (last || '?').charAt(0).toUpperCase()
  return `${f}${l}`
}

function timeAgo(iso: string) {
  try {
    const then = new Date(iso).getTime()
    const now = Date.now()
    const diff = Math.max(0, now - then)

    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`

    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`

    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`

    const weeks = Math.floor(days / 7)
    if (weeks < 4) return `${weeks}w ago`

    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`

    const years = Math.floor(days / 365)
    return `${years}y ago`
  } catch {
    return ''
  }
}

/* Strip HTML tags to measure plain-text length (for edit validation) */
function plainTextLength(html: string) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return (tmp.textContent || tmp.innerText || '').trim().length
}

/* ────────────────────────────────────────────────────────
   API helpers
   ──────────────────────────────────────────────────────── */

async function fetchMyStories(
  access: string | null
): Promise<Story[]> {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/stories/?mine=true`,
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
      (data && data.message) || 'Failed to load your stories'
    )
  }
  return (data?.stories ?? []) as Story[]
}

async function updateStory(
  access: string | null,
  id: number,
  payload: Partial<EditFormState>,
  newImage?: File | null
) {
  if (!access) throw new Error('No access token found.')

  if (newImage) {
    const fd = new FormData()
    if (payload.title !== undefined) fd.append('title', payload.title)
    if (payload.content !== undefined) fd.append('content', payload.content)
    if (payload.category !== undefined) fd.append('category', payload.category)
    fd.append('image', newImage)

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/stories/${id}/`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${access}`,
          Accept: 'application/json',
        },
        body: fd,
      }
    )
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(
        (data && data.message) || 'Failed to update story'
      )
    }
    return data
  }

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/stories/${id}/`,
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
      (data && data.message) || 'Failed to update story'
    )
  }
  return data
}

async function deleteStory(access: string | null, id: number) {
  if (!access) throw new Error('No access token found.')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/stories/${id}/`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${access}`,
        Accept: 'application/json',
      },
    }
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(
      (data && data.message) || 'Failed to delete story'
    )
  }
  return data
}

/* ────────────────────────────────────────────────────────
   Confirm delete modal
   ──────────────────────────────────────────────────────── */

interface ConfirmDeleteProps {
  open: boolean
  subject?: string
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDeleteModal({
  open,
  subject,
  isPending,
  onConfirm,
  onCancel,
}: ConfirmDeleteProps) {
  if (!open) return null

  return (
    <div
      className="mpx-modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="mpx-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mpx-modal-icon-wrap">
          <FiAlertTriangle className="mpx-modal-icon" />
        </div>

        <h3 className="mpx-modal-title">Delete this story?</h3>

        {subject && (
          <p className="mpx-modal-subject">“{subject}”</p>
        )}

        <p className="mpx-modal-text">
          This will permanently remove the story and its photo.
          This action cannot be undone.
        </p>

        <div className="mpx-modal-actions">
          <button
            type="button"
            className="mpx-modal-btn mpx-modal-btn-secondary"
            onClick={onCancel}
            disabled={isPending}
          >
            Keep it
          </button>

          <button
            type="button"
            className="mpx-modal-btn mpx-modal-btn-danger"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span className="mpx-spinner-small" />
                Deleting…
              </>
            ) : (
              <>
                <FiTrash2 /> Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */

const MyPosts = () => {
  const { access } = useAuthStore()
  const queryClient = useQueryClient()

  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const [form, setForm] = useState<EditFormState | null>(null)
  const [newImage, setNewImage] = useState<File | null>(null)
  const [newImagePreview, setNewImagePreview] = useState<string | null>(
    null
  )

  const [pendingDelete, setPendingDelete] = useState<Story | null>(null)

  /* ── Fetch ─────────────────────────────────────────── */
  const {
    data: stories,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['my-stories', access],
    queryFn: () => fetchMyStories(access),
    enabled: !!access,
    staleTime: 30_000,
  })

  const list = stories ?? []

  /* ── Update mutation ───────────────────────────────── */
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
      image,
    }: {
      id: number
      payload: Partial<EditFormState>
      image?: File | null
    }) => updateStory(access, id, payload, image),
    onSuccess: () => {
      toast.success('Story updated.', {
        duration: 2500,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })
      queryClient.invalidateQueries({ queryKey: ['my-stories'] })
      closeEdit()
    },
    onError: (err: Error) => {
      toast.error('Failed to update story', {
        description: err.message,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
    },
  })

  /* ── Delete mutation ───────────────────────────────── */
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStory(access, id),
    onSuccess: () => {
      toast.success('Story deleted.', {
        duration: 2500,
        icon: '🗑️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })
      queryClient.invalidateQueries({ queryKey: ['my-stories'] })
      setPendingDelete(null)
    },
    onError: (err: Error) => {
      toast.error('Failed to delete story', {
        description: err.message,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
    },
  })

  /* ── Edit open / close ─────────────────────────────── */
  const openEdit = (story: Story) => {
    setEditingStory(story)
    setForm({
      title: story.title,
      content: story.content,
      category: story.category,
    })
    setNewImage(null)
    if (newImagePreview) URL.revokeObjectURL(newImagePreview)
    setNewImagePreview(null)
  }

  const closeEdit = () => {
    if (updateMutation.isPending) return
    setEditingStory(null)
    setForm(null)
    setNewImage(null)
    if (newImagePreview) URL.revokeObjectURL(newImagePreview)
    setNewImagePreview(null)
  }

  /* ── Image pick ────────────────────────────────────── */
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    if (!picked) return

    if (!picked.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    if (picked.size > 8 * 1024 * 1024) {
      toast.error('Image must be under 8MB.')
      return
    }

    if (newImagePreview) URL.revokeObjectURL(newImagePreview)
    setNewImage(picked)
    setNewImagePreview(URL.createObjectURL(picked))

    e.target.value = ''
  }

  const clearNewImage = () => {
    if (newImagePreview) URL.revokeObjectURL(newImagePreview)
    setNewImage(null)
    setNewImagePreview(null)
  }

  /* ── Save ──────────────────────────────────────────── */
  const handleSave = () => {
    if (!editingStory || !form) return

    if (!form.title.trim() || form.title.trim().length < 3) {
      toast.error('Title must be at least 3 characters.')
      return
    }
    if (plainTextLength(form.content) < 10) {
      toast.error('Content must be at least 10 characters.')
      return
    }

    updateMutation.mutate({
      id: editingStory.id,
      payload: {
        title: form.title.trim(),
        content: form.content,
        category: form.category,
      },
      image: newImage,
    })
  }

  const setField = <K extends keyof EditFormState>(
    key: K,
    value: EditFormState[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  /* ── Delete confirm ────────────────────────────────── */
  const requestDelete = (story: Story) => setPendingDelete(story)
  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteMutation.mutate(pendingDelete.id)
  }
  const cancelDelete = () => {
    if (deleteMutation.isPending) return
    setPendingDelete(null)
  }

  /* ── Loader ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="mpx-loader">
        <Spinner
          message="Loading your stories"
          slowMessage="This is taking a bit longer than usual…"
          slowAfter={4000}
        />
      </div>
    )
  }

  /* ── Render ────────────────────────────────────────── */
  return (
    <div className="mpx-root">
      {/* ── Toolbar ─────────────────────────────────── */}
      <div className="mpx-toolbar">
        <h2 className="mpx-toolbar-title">
          {list.length} {list.length === 1 ? 'story' : 'stories'}
        </h2>

        <button
          type="button"
          className="mpx-icon-btn"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh"
          title="Refresh"
        >
          <FiRefreshCw
            className={`mpx-icon ${isFetching ? 'mpx-icon-spinning' : ''}`}
          />
        </button>
      </div>

      {/* ── Empty ───────────────────────────────────── */}
      {list.length === 0 && (
        <div className="mpx-state">
          <FiInbox className="mpx-state-icon" />
          <h3 className="mpx-state-title">No stories yet</h3>
          <p className="mpx-state-text">
            Share an idea, a success, or something fun — your
            stories will show up here.
          </p>
        </div>
      )}

      {/* ── Feed ────────────────────────────────────── */}
      {list.length > 0 && (
        <div className="mpx-feed">
          {list.map((story) => {
            const isEditing = editingStory?.id === story.id
            const isDeleting =
              deleteMutation.isPending &&
              pendingDelete?.id === story.id

            return (
              <article
                key={story.id}
                className={`mpx-post ${isEditing ? 'mpx-post-editing' : ''}`}
              >
                {/* ── Editing mode ──────────────────── */}
                {isEditing ? (
                  <div className="mpx-edit">
                    <div className="mpx-edit-row">
                      <span className="mpx-edit-label">Editing story</span>
                      <button
                        type="button"
                        className="mpx-edit-close"
                        onClick={closeEdit}
                        disabled={updateMutation.isPending}
                        aria-label="Close edit"
                      >
                        <FiX />
                      </button>
                    </div>

                    {/* Title */}
                    <div className="mpx-edit-field">
                      <label className="mpx-edit-field-label">
                        Title
                      </label>
                      <input
                        type="text"
                        className="mpx-edit-input"
                        value={form?.title || ''}
                        onChange={(e) =>
                          setField('title', e.target.value)
                        }
                        disabled={updateMutation.isPending}
                        maxLength={200}
                      />
                    </div>

                    {/* Content — plain textarea for edit */}
                    <div className="mpx-edit-field">
                      <label className="mpx-edit-field-label">
                        Content
                      </label>
                      <textarea
                        className="mpx-edit-textarea"
                        value={form?.content || ''}
                        onChange={(e) =>
                          setField('content', e.target.value)
                        }
                        disabled={updateMutation.isPending}
                        rows={6}
                        maxLength={2000}
                      />
                    </div>

                    {/* Category */}
                    <div className="mpx-edit-field">
                      <label className="mpx-edit-field-label">
                        <FiTag className="mpx-edit-field-icon" />
                        Category
                      </label>
                      <select
                        className="mpx-edit-select"
                        value={form?.category || 'ideas'}
                        onChange={(e) =>
                          setField(
                            'category',
                            e.target.value as StoryCategory
                          )
                        }
                        disabled={updateMutation.isPending}
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Image replace */}
                    <div className="mpx-edit-field">
                      <label className="mpx-edit-field-label">
                        <FiImage className="mpx-edit-field-icon" />
                        Photo
                      </label>

                      {newImagePreview ? (
                        <div className="mpx-edit-preview">
                          <img src={newImagePreview} alt="New" />
                          <button
                            type="button"
                            className="mpx-edit-preview-remove"
                            onClick={clearNewImage}
                            disabled={updateMutation.isPending}
                            aria-label="Remove new image"
                          >
                            <FiX />
                          </button>
                        </div>
                      ) : (
                        <div className="mpx-edit-photo-row">
                          {story.image_url && (
                            <img
                              src={story.image_url}
                              alt=""
                              className="mpx-edit-photo-current"
                            />
                          )}
                          <label className="mpx-edit-photo-pick">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImagePick}
                              disabled={updateMutation.isPending}
                              hidden
                            />
                            Choose new photo
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mpx-edit-actions">
                      <button
                        type="button"
                        className="mpx-edit-save"
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? (
                          <>
                            <span className="mpx-spinner-small" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <FiSave /> Save
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="mpx-edit-cancel"
                        onClick={closeEdit}
                        disabled={updateMutation.isPending}
                      >
                        <FiXCircle /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* ── Header — avatar + name ──────── */}
                    <header className="mpx-post-header">
                      <div className="mpx-post-avatar-wrap">
                        {story.author.profile_image_url ? (
                          <img
                            src={story.author.profile_image_url}
                            alt={story.author.full_name}
                            className="mpx-post-avatar"
                            loading="lazy"
                          />
                        ) : (
                          <div className="mpx-post-avatar-fallback">
                            {initials(
                              story.author.first_name,
                              story.author.last_name
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mpx-post-meta">
                        <span className="mpx-post-author">
                          {story.author.full_name || 'You'}
                        </span>
                        <span className="mpx-post-time">
                          {timeAgo(story.created_at)}
                        </span>
                      </div>

                      <div className="mpx-post-actions">
                        <button
                          type="button"
                          className="mpx-post-action"
                          onClick={() => openEdit(story)}
                          title="Edit"
                          aria-label="Edit story"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="mpx-post-action mpx-post-action-danger"
                          onClick={() => requestDelete(story)}
                          title="Delete"
                          aria-label="Delete story"
                          disabled={isDeleting}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </header>

                    {/* ── Full-width image — object-fit: cover ── */}
                    {story.image_url && (
                      <div className="mpx-post-media">
                        <img
                          src={story.image_url}
                          alt={story.title}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}

                    {/* ── Title + rich HTML description below ── */}
                    <div className="mpx-post-body">
                      <h3 className="mpx-post-title">{story.title}</h3>

                      <div
                        className="mpx-post-content"
                        dangerouslySetInnerHTML={{
                          __html: story.content,
                        }}
                      />
                    </div>

                    {/* ── Category pill at the bottom ─── */}
                    <div className="mpx-post-foot">
                      <span
                        className={`mpx-cat-pill mpx-cat-${story.category}`}
                      >
                        {CATEGORY_LABELS[story.category]}
                      </span>
                    </div>
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* ── Confirm delete modal ────────────────────── */}
      <ConfirmDeleteModal
        open={!!pendingDelete}
        subject={pendingDelete?.title}
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  )
}

export default MyPosts