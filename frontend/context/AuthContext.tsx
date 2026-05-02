"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  type AuthUser,
  getToken,
  getStoredUser,
  setToken,
  setStoredUser,
  logout as authLogout,
  isTokenExpired,
} from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token && !isTokenExpired(token)) {
      const cached = getStoredUser();
      if (cached) setUser(cached);
    } else if (token) {
      // expired — clear silently
      authLogout();
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((token: string, u: AuthUser) => {
    setToken(token);
    setStoredUser(u);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "https://dsex.onrender.com";
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          authLogout();
          setUser(null);
        }
        return;
      }
      const { user: fresh } = (await res.json()) as { user: AuthUser };
      setStoredUser(fresh);
      setUser(fresh);
    } catch {
      // network error — keep current state
    }
  }, []);

  const isAdmin = user?.is_admin === true;

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isLoggedIn: !!user, isAdmin, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
