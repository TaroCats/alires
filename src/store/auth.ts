import { create } from "zustand";

type AuthState = {
  token: string | null;
  expiresAt: string | null;
  setAuth: (token: string, expiresAt: string) => void;
  logout: () => void;
};

const savedToken = localStorage.getItem("alires-token");
const savedExpiresAt = localStorage.getItem("alires-expires-at");

export const useAuthStore = create<AuthState>((set) => ({
  token: savedToken,
  expiresAt: savedExpiresAt,
  setAuth: (token, expiresAt) => {
    localStorage.setItem("alires-token", token);
    localStorage.setItem("alires-expires-at", expiresAt);
    set({ token, expiresAt });
  },
  logout: () => {
    localStorage.removeItem("alires-token");
    localStorage.removeItem("alires-expires-at");
    set({ token: null, expiresAt: null });
  },
}));
