/**
 * Thin fetch wrapper for the carbtrack-au backend. Phase 1 ships only the
 * base URL + auth header plumbing — endpoint helpers (foods, recipes,
 * attachments) are added in Phase 2.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
  const token = import.meta.env.VITE_API_TOKEN ?? "";
  if (!baseUrl) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(`${res.status} ${res.statusText}`, res.status, body);
  }
  return res.json() as Promise<T>;
}
