import { create } from "zustand";

interface AdminSoundState {
  soundEnabled: boolean;
  toggleSound: () => void;
  setSoundEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = "next_admin_sound_alert";

function getInitialSoundPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved !== null ? saved === "true" : true;
  } catch {
    return true;
  }
}

export const useAdminSoundStore = create<AdminSoundState>((set) => ({
  soundEnabled: getInitialSoundPreference(),
  toggleSound: () =>
    set((state) => {
      const next = !state.soundEnabled;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, String(next));
        } catch {
          // ignore
        }
      }
      return { soundEnabled: next };
    }),
  setSoundEnabled: (enabled: boolean) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, String(enabled));
      } catch {
        // ignore
      }
    }
    set({ soundEnabled: enabled });
  },
}));

