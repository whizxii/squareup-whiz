"use client";

import { useToastStore, Toast, ToastType } from "@/lib/stores/toast-store";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const ICON_MAP: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const COLOR_MAP: Record<ToastType, string> = {
  success: "border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400",
  error: "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400",
  info: "border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400",
  warning: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
};

const ICON_COLOR_MAP: Record<ToastType, string> = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-amber-500",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[200] flex flex-col-reverse gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [visible, setVisible] = useState(false);

  const Icon = ICON_MAP[toast.type];

  useEffect(() => {
    // Animate in
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300",
        COLOR_MAP[toast.type],
        visible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
      )}
      role="alert"
    >
      <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", ICON_COLOR_MAP[toast.type])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-0.5 rounded-md hover:bg-accent/50 transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
