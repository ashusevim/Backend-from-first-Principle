"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };

const ToastCtx = createContext<{ toast: (message: string, kind?: ToastKind) => void }>({
  toast: () => {},
});

export const useToast = () => useContext(ToastCtx);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = nextId++;
    setToasts((t) => [...t.slice(-2), { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-full items-center gap-2.5 rounded-lg border bg-card px-4 py-2.5 text-sm shadow-lg animate-fade-in",
              t.kind === "error" ? "border-destructive/50" : "border-border"
            )}
            role="status"
          >
            {t.kind === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
            {t.kind === "error" && <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
            {t.kind === "info" && <Info className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
