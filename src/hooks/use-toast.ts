import { useCallback } from 'react';

export type Toast = {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info';
};

// Global toast state
let toastListeners: Set<(toast: Toast) => void> = new Set();
let toastId = 0;

export function useToast() {
  const addToast = useCallback((message: string, variant: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${++toastId}`;
    const toast: Toast = { id, message, variant };
    
    toastListeners.forEach(listener => listener(toast));
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3000);
    
    return id;
  }, []);

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message: string) => addToast(message, 'error'), [addToast]);
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast]);

  return { toast: addToast, success, error, info };
}

export function removeToast(id: string) {
  toastListeners.forEach(listener => {
    listener({ id, message: '', variant: 'info' });
  });
}

export function subscribeToToasts(listener: (toast: Toast) => void) {
  toastListeners.add(listener);
  return () => toastListeners.delete(listener);
}
