import { create } from 'zustand';

interface MountStore {
  mount: boolean;
  toggleMount: () => void;
}

export const useMountStore = create<MountStore>((set) => ({
  mount: false,

  toggleMount: () =>
    set((state) => ({
      mount: !state.mount,
    })),
}));