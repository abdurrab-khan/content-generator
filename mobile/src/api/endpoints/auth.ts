import { ApiError, authFetch } from '../http';
import type { User } from '../types';

/**
 * better-auth email/password endpoints. The server has the `bearer()` plugin
 * enabled, so successful sign-in/up responses carry the session token in the
 * `set-auth-token` header (with `token` in the body as a fallback).
 */

interface AuthBody {
  token?: string;
  user?: User;
}

export interface AuthResult {
  token: string;
  user: User;
}

function extractAuthResult(body: AuthBody, headers: Headers): AuthResult {
  const token = headers.get('set-auth-token') ?? body.token ?? null;
  if (!token || !body.user) {
    throw new ApiError(500, 'Unexpected auth response from server', '/auth');
  }
  return { token, user: body.user };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { body, headers } = await authFetch<AuthBody>('/auth/sign-in/email', {
    method: 'POST',
    body: { email, password },
  });
  return extractAuthResult(body, headers);
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const { body, headers } = await authFetch<AuthBody>('/auth/sign-up/email', {
    method: 'POST',
    body: { name, email, password },
  });
  return extractAuthResult(body, headers);
}

interface SessionBody {
  session: unknown;
  user: User;
}

/** Returns the user for the current bearer token, or null when expired/absent. */
export async function getSessionUser(): Promise<User | null> {
  try {
    const { body } = await authFetch<SessionBody | null>('/auth/get-session');
    return body?.user ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function signOutRemote(): Promise<void> {
  try {
    await authFetch('/auth/sign-out', { method: 'POST', body: {} });
  } catch {
    // Local sign-out proceeds regardless of server state.
  }
}
