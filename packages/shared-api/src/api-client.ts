import type { ApiError } from "@omarsapp/shared-types";

const BASE_URL =
  typeof window !== "undefined"
    ? ((window as Window & { __API_URL__?: string }).__API_URL__ ?? "/api/v1")
    : "/api/v1";

/**
 * Liefert den aktuellen Access-Token (Memory-Store). Wird beim App-Start
 * registriert (z.B. aus dem Auth-Store), damit shared-api nicht von
 * shared-stores abhängen muss.
 */
type AuthTokenProvider = () => string | null;

let authTokenProvider: AuthTokenProvider | null = null;

export function setAuthTokenProvider(provider: AuthTokenProvider | null): void {
  authTokenProvider = provider;
}

class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = authTokenProvider?.() ?? null;
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    // Vertrag ist {error, code}; FastAPIs HTTPException liefert {detail}
    const body = (await response
      .json()
      .catch(() => ({}))) as Partial<ApiError> & {
      detail?: string;
    };
    throw new ApiClientError(
      response.status,
      body.code ?? "UNKNOWN_ERROR",
      body.error ?? body.detail ?? response.statusText,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { method: "GET", ...init }),
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), ...init }),
  patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), ...init }),
  put: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body), ...init }),
  delete: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { method: "DELETE", ...init }),
  ApiClientError,
};
