import { create } from "zustand";

/**
 * Global toast queue — framework-level store so non-React helpers
 * (clipboard, downloads) can surface feedback without prop drilling.
 * Rendered by <ToastHost /> mounted once in the root layout.
 */

export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
}

const TOAST_DURATION_MS = 2200;
let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, kind = "success") => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message, kind }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, TOAST_DURATION_MS);
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

/** Imperative helper for use outside components. */
export const toast = {
  success: (message: string) =>
    useToastStore.getState().show(message, "success"),
  error: (message: string) => useToastStore.getState().show(message, "error"),
  info: (message: string) => useToastStore.getState().show(message, "info"),
};
