import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getSessionUser,
  signInWithEmail,
  signOutRemote,
  signUpWithEmail,
  type AuthResult,
} from '../api/endpoints/auth';
import { setAuthToken } from '../api/http';
import type { User } from '../api/types';
import { tokenStorage } from './token-storage';

/**
 * Session lifecycle: restores the bearer token on boot (validating it
 * against /api/auth/get-session), exposes sign-in/up/out, and keeps the
 * HTTP layer's Authorization header in sync.
 */

export type SessionStatus = 'loading' | 'signedIn' | 'signedOut';

interface SessionContextValue {
  status: SessionStatus;
  user: User | null;
  /** Non-null when bootstrapping failed due to a network/server problem. */
  bootError: string | null;
  retryBootstrap: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await tokenStorage.get();
        if (!token) {
          if (!cancelled) setStatus('signedOut');
          return;
        }
        setAuthToken(token);
        const sessionUser = await getSessionUser();
        if (cancelled) return;
        if (sessionUser) {
          setUser(sessionUser);
          setStatus('signedIn');
        } else {
          // Token rejected — drop it.
          await tokenStorage.clear();
          setAuthToken(null);
          setStatus('signedOut');
        }
      } catch (error) {
        if (cancelled) return;
        setAuthToken(null);
        setBootError(
          error instanceof Error
            ? error.message
            : 'Could not verify your session.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootAttempt]);

  const retryBootstrap = useCallback(() => {
    setBootError(null);
    setStatus('loading');
    setBootAttempt((n) => n + 1);
  }, []);

  const applyAuth = useCallback(async (result: AuthResult) => {
    setAuthToken(result.token);
    await tokenStorage.set(result.token);
    setUser(result.user);
    setStatus('signedIn');
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await signInWithEmail(email.trim().toLowerCase(), password);
      await applyAuth(result);
    },
    [applyAuth],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await signUpWithEmail(name.trim(), email.trim().toLowerCase(), password);
      await applyAuth(result);
    },
    [applyAuth],
  );

  const signOut = useCallback(async () => {
    await signOutRemote();
    await tokenStorage.clear();
    setAuthToken(null);
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ status, user, bootError, retryBootstrap, signIn, signUp, signOut }),
    [status, user, bootError, retryBootstrap, signIn, signUp, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
