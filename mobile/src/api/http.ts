import { API_URL, APP_ORIGIN } from "../config/env";

/**
 * Transport layer — a thin fetch wrapper that knows about:
 *  - the API base URL
 *  - the bearer session token (set by the session module)
 *  - the NestJS `{ data, meta }` response envelope
 *  - the uniform error envelope → `ApiError`
 *
 * No React in here — this module is pure TypeScript and fully replaceable.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(status: number, message: string, path: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

export interface RawResponse<T> {
  body: T;
  headers: Headers;
  status: number;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = `${API_URL}${path}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

async function parseError(response: Response, path: string): Promise<ApiError> {
  let message = `Request failed (${response.status})`;
  try {
    const body: unknown = await response.json();
    const raw = (body as { message?: unknown } | null)?.message;
    if (Array.isArray(raw)) message = raw.filter(Boolean).join(", ");
    else if (typeof raw === "string" && raw.length > 0) message = raw;
  } catch {
    // non-JSON error body — keep default message
  }
  return new ApiError(response.status, message, path);
}

async function rawRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<RawResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // RN's cookie jar re-sends the better-auth session cookie once set, and
    // the server's CSRF guard then requires a trusted Origin on auth POSTs.
    Origin: APP_ORIGIN,
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "Cannot reach the server — is the API running and the device on the same network?",
      path,
    );
  }

  if (!response.ok) throw await parseError(response, path);
  if (response.status === 204) {
    return {
      body: undefined as T,
      headers: response.headers,
      status: response.status,
    };
  }
  const body = (await response.json()) as T;
  return { body, headers: response.headers, status: response.status };
}

/**
 * NestJS routes — unwraps the `{ data, meta }` envelope produced by the
 * TransformInterceptor. Pagination payloads arrive as `data: items[]` +
 * `meta: { total, page, pageSize }`.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta: Record<string, unknown> | null }> {
  const { body } = await rawRequest<
    { data: T; meta?: Record<string, unknown> } | T
  >(path, options);
  if (body && typeof body === "object" && "data" in body) {
    const envelope = body as { data: T; meta?: Record<string, unknown> };
    return { data: envelope.data, meta: envelope.meta ?? null };
  }
  return { data: body as T, meta: null };
}

/**
 * better-auth routes (`/api/auth/*`) — NOT enveloped; returns the raw body
 * plus response headers (the bearer plugin exposes `set-auth-token`).
 */
export async function authFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<RawResponse<T>> {
  return rawRequest<T>(path, options);
}
