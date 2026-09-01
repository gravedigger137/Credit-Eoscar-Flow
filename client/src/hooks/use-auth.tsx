import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, resetCsrfToken } from "@/lib/queryClient";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "";

function apiUrl(url: string) {
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

type AuthUser = {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  role: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; password: string; fullName?: string; email?: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 60000,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      return res.json();
    },
    onSuccess: (userData) => {
      qc.setQueryData(["/api/auth/me"], userData);
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; fullName?: string; email?: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: (userData) => {
      qc.setQueryData(["/api/auth/me"], userData);
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
      resetCsrfToken();
    },
    onSuccess: () => {
      qc.setQueryData(["/api/auth/me"], null);
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        login: async (username, password) => { await loginMutation.mutateAsync({ username, password }); },
        register: async (data) => { await registerMutation.mutateAsync(data); },
        logout: async () => { await logoutMutation.mutateAsync(); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}


