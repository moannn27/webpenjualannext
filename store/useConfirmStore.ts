import { create } from "zustand";

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "default";
  icon?: "trash" | "alert" | "info" | "help" | "check";
  showCancel?: boolean;
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmDialogOptions;
  resolve: ((value: boolean) => void) | null;
  openConfirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  closeConfirm: (result: boolean) => void;
}

const DEFAULT_OPTIONS: ConfirmDialogOptions = {
  title: "Konfirmasi Tindakan",
  message: "Apakah Anda yakin ingin melanjutkan tindakan ini?",
  confirmText: "Ya, Lanjutkan",
  cancelText: "Batal",
  variant: "default",
  icon: "help",
  showCancel: true,
};

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: DEFAULT_OPTIONS,
  resolve: null,

  openConfirm: (options) => {
    // If there is an existing pending confirmation, resolve it with false
    const currentResolve = get().resolve;
    if (currentResolve) {
      currentResolve(false);
    }

    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options: { ...DEFAULT_OPTIONS, ...options },
        resolve,
      });
    });
  },

  closeConfirm: (result) => {
    const { resolve } = get();
    if (resolve) {
      resolve(result);
    }
    set({
      isOpen: false,
      resolve: null,
    });
  },
}));

/**
 * Pengganti modern & custom untuk window.confirm bawaan browser.
 * Menghasilkan modal dialog animasi yang nyaman, mendukung tema dark/light,
 * dan mengembalikan Promise<boolean>.
 *
 * Contoh penggunaan:
 * ```ts
 * const confirmed = await confirmAction({
 *   title: "Hapus Ulasan",
 *   message: "Hapus ulasan produk ini?",
 *   confirmText: "Hapus",
 *   variant: "danger",
 * });
 * if (!confirmed) return;
 * ```
 */
export function confirmAction(options: ConfirmDialogOptions): Promise<boolean> {
  return useConfirmStore.getState().openConfirm(options);
}

/**
 * Pengganti modern untuk window.alert bawaan browser.
 */
export function alertAction(title: string, message: string, variant: "info" | "danger" | "warning" = "info"): Promise<boolean> {
  return useConfirmStore.getState().openConfirm({
    title,
    message,
    confirmText: "Mengerti",
    showCancel: false,
    variant,
    icon: variant === "danger" ? "alert" : variant === "warning" ? "alert" : "info",
  });
}

