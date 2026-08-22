import { create } from 'zustand';

interface MountStore {
  mount: boolean;
  isMounted: boolean;
  toggleMount: () => void;
  setIsMounted: (value: boolean) => void;
}

export const useMountStore = create<MountStore>((set) => ({
  mount: false,
  isMounted: false,

  toggleMount: () =>
    set((state) => ({
      mount: !state.mount,
      isMounted: !state.isMounted,
    })),

  setIsMounted: (value) =>
    set(() => ({
      isMounted: value,
    })),
}));