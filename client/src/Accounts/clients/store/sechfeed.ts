import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchFeedState {
  isMounted: boolean;
  selectedUserId: string | null;
  setSelectedUser: (userId: string | null) => void;
  setIsMounted: (isMounted: boolean) => void;
  reset: () => void;
}

const useSearchFeedStore = create<SearchFeedState>()(
  persist(
    (set) => ({
      isMounted: false,
      selectedUserId: null,
      
      setSelectedUser: (userId: string | null) => {
        console.log('🔵 Setting selected user:', userId);
        set({ 
          selectedUserId: userId,
          isMounted: userId !== null
        });
      },
      
      setIsMounted: (isMounted: boolean) => {
        set({ isMounted });
      },
      
      reset: () => {
        console.log('🔄 Resetting search feed store');
        set({ 
          isMounted: false,
          selectedUserId: null 
        });
      },
    }),
    {
      name: 'searchfeed-storage',
      storage: {
        getItem: (name) => {
          const value = localStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);

export default useSearchFeedStore;