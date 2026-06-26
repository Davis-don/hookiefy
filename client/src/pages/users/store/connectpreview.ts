import { create } from "zustand";

interface PreviewStore {
  isMount: boolean;
  id: string | null;

  setIsMount: (value: boolean) => void;
  setId: (id: string | null) => void;
  openPreview: (id: string) => void;
  closePreview: () => void;
}

export const usePreviewStore = create<PreviewStore>((set) => ({
  isMount: false,
  id: null,

  setIsMount: (value) => set({ isMount: value }),

  setId: (id) => set({ id }),

  openPreview: (id) =>
    set({
      isMount: true,
      id,
    }),

  closePreview: () =>
    set({
      isMount: false,
      id: null,
    }),
}));