import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { login as requestLogin } from "../api/admin";

interface AuthContextValue {
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "immersive-menu-admin-token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(STORAGE_KEY));
  useEffect(() => {
    function expireSession() {
      sessionStorage.removeItem(STORAGE_KEY);
      setToken(null);
    }
    window.addEventListener("admin-session-expired", expireSession);
    return () => window.removeEventListener("admin-session-expired", expireSession);
  }, []);
  const value = useMemo<AuthContextValue>(() => ({
    token,
    async signIn(email, password) {
      const session = await requestLogin(email, password);
      sessionStorage.setItem(STORAGE_KEY, session.accessToken);
      setToken(session.accessToken);
    },
    signOut() {
      sessionStorage.removeItem(STORAGE_KEY);
      setToken(null);
    },
  }), [token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
