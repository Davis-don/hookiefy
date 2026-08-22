// useEditComModalStore.ts

import { create } from "zustand";

interface EditComModalStore {
  mounted: boolean;
  id: string | null;

  toggleModal: (id?: string) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useEditComModalStore = create<EditComModalStore>(
  (set, get) => ({
    mounted: false,
    id: null,

    toggleModal: (id?: string) => {
      const { mounted } = get();

      if (mounted) {
        set({
          mounted: false,
          id: null,
        });
      } else {
        set({
          mounted: true,
          id: id ?? null,
        });
      }
    },

    openModal: (id: string) =>
      set({
        mounted: true,
        id,
      }),

    closeModal: () =>
      set({
        mounted: false,
        id: null,
      }),
  })
);