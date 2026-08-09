import * as SecureStore from 'expo-secure-store';

/**
 * Session token persistence — hardware-backed secure storage
 * (Android Keystore) via expo-secure-store.
 */

const TOKEN_KEY = 'cg.session_token';

export const tokenStorage = {
  get(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async set(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
