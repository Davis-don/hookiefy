// store/modalstore.ts
import { create } from "zustand";

interface PaymentModalStore {
  // Modal state
  isMount: boolean;
  hookupId: string | null;
  
  // Payment states
  isSuccessPayment: boolean;
  isFailedPayment: boolean;
  isLoadingPayment: boolean;

  // Actions
  open: (hookupId: string) => void;
  close: () => void;
  
  setIsMount: (value: boolean) => void;
  setHookupId: (hookupId: string | null) => void;
  
  setIsSuccessPayment: (value: boolean) => void;
  setIsFailedPayment: (value: boolean) => void;
  setIsLoadingPayment: (value: boolean) => void;
  
  // Reset all states
  reset: () => void;
}

export const usePaymentModalStore = create<PaymentModalStore>((set) => ({
  // Initial states
  isMount: false,
  hookupId: null,

  isSuccessPayment: false,
  isFailedPayment: false,
  isLoadingPayment: false,

  // Open modal with connection ID
  open: (hookupId) => {
    console.log('📂 Store: Opening modal with hookupId:', hookupId);
    set({
      isMount: true,
      hookupId,
      isSuccessPayment: false,
      isFailedPayment: false,
      isLoadingPayment: false,
    });
  },

  // Close modal and reset
  close: () => {
    console.log('📂 Store: Closing modal');
    set({
      isMount: false,
      hookupId: null,
      isSuccessPayment: false,
      isFailedPayment: false,
      isLoadingPayment: false,
    });
  },

  setIsMount: (value) => {
    console.log('📂 Store: Setting isMount to:', value);
    set({
      isMount: value,
    });
  },

  setHookupId: (hookupId) => {
    console.log('📂 Store: Setting hookupId to:', hookupId);
    set({
      hookupId,
    });
  },

  setIsSuccessPayment: (value) => {
    console.log('📂 Store: Setting isSuccessPayment to:', value);
    set({
      isSuccessPayment: value,
      isFailedPayment: value ? false : false,
      isLoadingPayment: value ? false : false,
    });
  },

  setIsFailedPayment: (value) => {
    console.log('📂 Store: Setting isFailedPayment to:', value);
    set({
      isFailedPayment: value,
      isSuccessPayment: value ? false : false,
      isLoadingPayment: value ? false : false,
    });
  },

  setIsLoadingPayment: (value) => {
    console.log('📂 Store: Setting isLoadingPayment to:', value);
    set({
      isLoadingPayment: value,
      isSuccessPayment: value ? false : false,
      isFailedPayment: value ? false : false,
    });
  },

  reset: () => {
    console.log('📂 Store: Resetting all states');
    set({
      isMount: false,
      hookupId: null,
      isSuccessPayment: false,
      isFailedPayment: false,
      isLoadingPayment: false,
    });
  },
}));

// Selector hooks for better performance
export const useModalState = () => {
  const state = usePaymentModalStore();
  return {
    isMount: state.isMount,
    hookupId: state.hookupId,
    isSuccessPayment: state.isSuccessPayment,
    isFailedPayment: state.isFailedPayment,
    isLoadingPayment: state.isLoadingPayment,
  };
};

export const useModalActions = () => {
  const state = usePaymentModalStore();
  return {
    open: state.open,
    close: state.close,
    setIsMount: state.setIsMount,
    setHookupId: state.setHookupId,
    setIsSuccessPayment: state.setIsSuccessPayment,
    setIsFailedPayment: state.setIsFailedPayment,
    setIsLoadingPayment: state.setIsLoadingPayment,
    reset: state.reset,
  };
};