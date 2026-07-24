import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  isAuthenticated: boolean;
  role: "guest" | "customer" | "admin";
  user: {
    name: string;
    email: string;
  } | null;
  login: (email: string, role: "customer" | "admin") => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      role: "guest",
      user: null,
      login: (email, role) =>
        set({
          isAuthenticated: true,
          role,
          user: {
            name: role === "admin" ? "Admin User" : "Customer",
            email,
          },
        }),
      logout: () =>
        set({
          isAuthenticated: false,
          role: "guest",
          user: null,
        }),
    }),
    {
      name: "auth-storage",
    }
  )
);
