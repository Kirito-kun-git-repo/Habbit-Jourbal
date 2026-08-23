"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastTone = "info" | "error" | "success";
type Toast = { id: number; message: string; tone: ToastTone };

const ToastContext = createContext<{
  notify: (message: string, tone?: ToastTone) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const toneStyles: Record<ToastTone, string> = {
  info: "border-line-strong bg-surface text-ink",
  success: "border-accent-soft bg-accent-tint text-accent-strong",
  error: "border-[#e8cfca] bg-[#fdf3f1] text-danger",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`anim-rise pointer-events-auto max-w-sm rounded-md border px-3.5 py-2.5 text-[14px] shadow-[0_2px_10px_rgba(38,35,31,0.07)] ${toneStyles[toast.tone]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
