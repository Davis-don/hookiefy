import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'romantic';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  title?: string;
  icon?: string;
}

interface ToastStore {
  currentToast: Toast | null;
  isMounted: boolean;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: () => void;
  setIsMounted: (mounted: boolean) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  currentToast: null,
  isMounted: false,
  
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id, duration: toast.duration || 5000 };
    
    set({ currentToast: newToast });

    if (newToast.duration !== 0) {
      setTimeout(() => {
        set((state) => {
          if (state.currentToast?.id === id) {
            return { currentToast: null };
          }
          return state;
        });
      }, newToast.duration);
    }
  },

  removeToast: () => {
    set({ currentToast: null });
  },

  setIsMounted: (mounted) => {
    set({ isMounted: mounted });
  },
}));

// Helper functions with Bootstrap colors
export const toast = {
  success: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
    useToastStore.getState().addToast({
      message,
      type: 'success',
      title: options?.title || '✨ Success!',
      icon: options?.icon || '✅',
      duration: options?.duration,
    });
  },
  
  error: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
    useToastStore.getState().addToast({
      message,
      type: 'error',
      title: options?.title || '❌ Error!',
      icon: options?.icon || '⚠️',
      duration: options?.duration,
    });
  },
  
  info: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
    useToastStore.getState().addToast({
      message,
      type: 'info',
      title: options?.title || 'ℹ️ Info',
      icon: options?.icon || '💡',
      duration: options?.duration,
    });
  },
  
  warning: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
    useToastStore.getState().addToast({
      message,
      type: 'warning',
      title: options?.title || '⚠️ Warning!',
      icon: options?.icon || '⚡',
      duration: options?.duration,
    });
  },
  
  romantic: (message: string, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
    useToastStore.getState().addToast({
      message,
      type: 'romantic',
      title: options?.title || '💕 Love is in the air',
      icon: options?.icon || '💝',
      duration: options?.duration || 6000,
    });
  },
  
  custom: (message: string, type: ToastType, options?: Partial<Omit<Toast, 'id' | 'message' | 'type'>>) => {
    useToastStore.getState().addToast({
      message,
      type,
      title: options?.title,
      icon: options?.icon,
      duration: options?.duration,
    });
  },
};