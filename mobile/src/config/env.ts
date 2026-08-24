import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * API base URL resolution, in priority order:
 *  1. EXPO_PUBLIC_API_URL env var (explicit override — use your LAN IP for
 *     physical devices, e.g. http://192.168.1.10:3000/api)
 *  2. Derived from the Expo dev-server host — when running via Expo Go on a
 *     physical device, the dev machine's IP is embedded in hostUri.
 *  3. Android emulator loopback → host machine.
 *  4. localhost fallback (web / iOS simulator).
 */
function resolveApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:3000/api`;
  }

  if (Platform.OS === "android") return "http://10.0.2.2:3000/api";
  return "http://localhost:3000/api";
}

/** Fully-qualified API base, e.g. http://192.168.1.10:3000/api */
export const API_URL = resolveApiUrl();

/** Origin without the /api suffix (auth lives under /api/auth as well). */
export const API_ORIGIN = API_URL.replace(/\/api$/, "");

/**
 * Origin header sent with every request. React Native keeps a shared cookie
 * jar, so once better-auth sets a session cookie its CSRF guard requires a
 * trusted Origin on auth POSTs — this scheme is listed in the API's
 * trustedOrigins (must match `scheme` in app.json).
 */
export const APP_ORIGIN = "clipforge://";
