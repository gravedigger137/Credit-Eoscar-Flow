import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "";

function apiUrl(url: string) {
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

let csrfToken: string | null = null;

export function resetCsrfToken() {
  csrfToken = null;
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const res = await fetch(apiUrl("/api/auth/csrf"), { credentials: "include" });
  if (!res.ok) throw new Error("Unable to initialize request security token");
  const data = await res.json() as { csrfToken: string };
  csrfToken = data.csrfToken;
  return csrfToken;
}

async function csrfHeaders(method: string): Promise<Record<string, string>> {
  if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) return {};
  return { "X-CSRF-Token": await getCsrfToken() };
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(apiUrl(url), {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(await csrfHeaders(method)),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

export async function csrfFetch(url: string, init: RequestInit = {}) {
  const method = init.method || "GET";
  const headers = new Headers(init.headers || {});
  const csrf = await csrfHeaders(method);
  Object.entries(csrf).forEach(([key, value]) => headers.set(key, value));
  return fetch(apiUrl(url), { ...init, headers, credentials: "include" });
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(apiUrl(queryKey.join("/") as string), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      staleTime: 15000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

