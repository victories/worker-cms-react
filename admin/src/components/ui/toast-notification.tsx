import { useState, useCallback, createContext, useContext } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons: Record<ToastType, typeof CheckCircle> = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };

  const colors: Record<ToastType, string> = {
    success: 'border-green-500/30 bg-green-50 text-green-800 dark:bg-green-950/50 dark:text-green-200',
    error: 'border-red-500/30 bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200',
    info: 'border-blue-500/30 bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200',
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg',
                'animate-slide-in-right min-w-[300px] max-w-[420px]',
                colors[t.type]
              )}
              style={{ animationDuration: '0.3s' }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-sm flex-1">{t.message}</span>
              <button onClick={() => removeToast(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
