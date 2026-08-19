import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Client-side app preferences — which application (content idea) is
 * currently selected. Persisted so the choice survives restarts.
 */

interface AppState {
  selectedApplicationId: string | null;
  setSelectedApplicationId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedApplicationId: null,
      setSelectedApplicationId: (id) => set({ selectedApplicationId: id }),
    }),
    {
      name: 'cg.app-state',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
