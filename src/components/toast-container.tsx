'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { Toast, subscribeToToasts } from '@/hooks/use-toast';

export function ToastContainer() {
  const [toasts, setToasts] = useState<Map<string, Toast>>(new Map());

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts(prev => {
        const newMap = new Map(prev);
        if (toast.message) {
          newMap.set(toast.id, toast);
        } else {
          newMap.delete(toast.id);
        }
        return newMap;
      });
    });

    return unsubscribe;
  }, []);

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 sm:top-6">
      {Array.from(toasts.values()).map(toast => (
        <div
          key={toast.id}
          className={`flex max-w-xl items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${
            toast.variant === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : toast.variant === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-900'
              : 'border-blue-200 bg-blue-50 text-blue-900'
          }`}
        >
          {toast.variant === 'success' && <CheckCircle className="h-5 w-5 flex-shrink-0" />}
          {toast.variant === 'error' && <XCircle className="h-5 w-5 flex-shrink-0" />}
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => {
              setToasts(prev => {
                const newMap = new Map(prev);
                newMap.delete(toast.id);
                return newMap;
              });
            }}
            className="flex-shrink-0 text-current hover:opacity-70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
