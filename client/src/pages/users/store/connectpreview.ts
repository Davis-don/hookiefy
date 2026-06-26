import { create } from "zustand";

interface PreviewStore {
  // Connection Request Preview
  isMount: boolean;
  id: string | null;

  // Activity Preview
  isActivityMount: boolean;
  activityId: string | null;

  setIsMount: (value: boolean) => void;
  setId: (id: string | null) => void;

  setIsActivityMount: (value: boolean) => void;
  setActivityId: (id: string | null) => void;

  openPreview: (id: string) => void;
  closePreview: () => void;

  openActivityPreview: (id: string) => void;
  closeActivityPreview: () => void;
}

export const usePreviewStore = create<PreviewStore>((set) => ({
  // Connection request
  isMount: false,
  id: null,

  // Activity
  isActivityMount: false,
  activityId: null,

  setIsMount: (value) =>
    set({
      isMount: value,
      ...(value
        ? {
            isActivityMount: false,
            activityId: null,
          }
        : {}),
    }),

  setId: (id) => set({ id }),

  setIsActivityMount: (value) =>
    set({
      isActivityMount: value,
      ...(value
        ? {
            isMount: false,
            id: null,
          }
        : {}),
    }),

  setActivityId: (activityId) => set({ activityId }),

  openPreview: (id) =>
    set({
      isMount: true,
      id,
      isActivityMount: false,
      activityId: null,
    }),

  closePreview: () =>
    set({
      isMount: false,
      id: null,
    }),

  openActivityPreview: (activityId) =>
    set({
      isActivityMount: true,
      activityId,
      isMount: false,
      id: null,
    }),

  closeActivityPreview: () =>
    set({
      isActivityMount: false,
      activityId: null,
    }),
}));