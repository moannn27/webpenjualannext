import { describe, it, expect, beforeEach } from "vitest";
import { useConfirmStore, confirmAction, alertAction } from "@/store/useConfirmStore";

describe("Custom Confirmation Dialog System", () => {
  beforeEach(() => {
    useConfirmStore.setState({
      isOpen: false,
      resolve: null,
    });
  });

  it("opens confirm dialog with custom title and message", async () => {
    const promise = confirmAction({
      title: "Hapus Ulasan",
      message: "Apakah Anda yakin ingin menghapus ulasan ini?",
      confirmText: "Hapus",
      cancelText: "Batal",
      variant: "danger",
    });

    const state = useConfirmStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.options.title).toBe("Hapus Ulasan");
    expect(state.options.variant).toBe("danger");

    // Simulate clicking confirm
    state.closeConfirm(true);

    const result = await promise;
    expect(result).toBe(true);
    expect(useConfirmStore.getState().isOpen).toBe(false);
  });

  it("resolves to false when cancelled", async () => {
    const promise = confirmAction({
      title: "Hapus Konten",
      message: "Hapus banner?",
    });

    const state = useConfirmStore.getState();
    expect(state.isOpen).toBe(true);

    // Simulate clicking cancel
    state.closeConfirm(false);

    const result = await promise;
    expect(result).toBe(false);
    expect(useConfirmStore.getState().isOpen).toBe(false);
  });

  it("handles alertAction with Mengerti button and single-action modal", async () => {
    const promise = alertAction("Informasi Sistem", "Pengaturan telah disimpan.", "info");

    const state = useConfirmStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.options.title).toBe("Informasi Sistem");
    expect(state.options.confirmText).toBe("Mengerti");
    expect(state.options.showCancel).toBe(false);

    state.closeConfirm(true);
    const result = await promise;
    expect(result).toBe(true);
  });
});

