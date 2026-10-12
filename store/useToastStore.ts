import { create } from "zustand";

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (toast) => {
    const id = crypto.randomUUID();
    const duration = toast.duration ?? 4500;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, message = "") =>
    useToastStore.getState().showToast({ title, message, type: "success" }),
  error: (title: string, message = "") =>
    useToastStore.getState().showToast({ title, message, type: "error" }),
  warning: (title: string, message = "") =>
    useToastStore.getState().showToast({ title, message, type: "warning" }),
  info: (title: string, message = "") =>
    useToastStore.getState().showToast({ title, message, type: "info" }),
};
