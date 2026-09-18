// src/store/usePostActionStore.ts
import { create } from 'zustand'

interface PostActionState {
  isOpen: boolean
  postId: number | null

  /**
   * Open the modal for a specific service.
   * Replaces any previous post — only one at a time.
   */
  open: (postId: number) => void

  /** Wipe everything. */
  clear: () => void
}

export const usePostActionStore = create<PostActionState>((set) => ({
  isOpen: false,
  postId: null,

  open: (postId) =>
    set({
      isOpen: true,
      postId,
    }),

  clear: () =>
    set({
      isOpen: false,
      postId: null,
    }),
}))