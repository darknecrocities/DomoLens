import { create } from "zustand";

export type ToastTone = "neutral" | "success" | "error";

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; run: () => void };
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, opts?: { tone?: ToastTone; action?: Toast["action"]; durationMs?: number }) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  show(message, opts = {}) {
    const id = nextId++;
    const toast: Toast = { id, message, tone: opts.tone ?? "neutral", action: opts.action };
    // Keep at most 3 on screen so it never feels noisy.
    set({ toasts: [...get().toasts, toast].slice(-3) });
    const duration = opts.durationMs ?? (opts.tone === "error" ? 6000 : 3500);
    setTimeout(() => get().dismiss(id), duration);
    return id;
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

/** Shortcut for code outside React components. */
export const toast = {
  info: (message: string) => useToasts.getState().show(message),
  success: (message: string) => useToasts.getState().show(message, { tone: "success" }),
  error: (message: string, action?: Toast["action"]) => useToasts.getState().show(message, { tone: "error", action }),
};
