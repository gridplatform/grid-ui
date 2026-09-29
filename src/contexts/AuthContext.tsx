import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthResponse, User } from "@/types/api";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/authStorage";

const API_BASE_URL = import.meta.env.VITE_GRID_API_URL || "/api/v1";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(token: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("session_expired");
  }
  return response.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchMe(token)
      .then(setUser)
      .catch(() => {
        clearAuthToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || "Login failed");
    }
    const data = (await response.json()) as AuthResponse;
    setAuthToken(data.token);
    setUser(data.user);
    await queryClient.invalidateQueries({ queryKey: ["auth"] });
  }, [queryClient]);

  const logout = useCallback(async () => {
    const token = getAuthToken();
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    clearAuthToken();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
