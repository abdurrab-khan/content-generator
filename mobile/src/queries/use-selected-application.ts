import { useEffect, useMemo } from 'react';
import type { Application } from '../api/types';
import { useAppStore } from '../store/app-store';
import { useApplications } from './use-applications';

/**
 * Resolves the currently-selected application: the persisted choice when it
 * still exists, otherwise the user's first application (and persists that
 * fallback). Returns null when the user has no applications yet → triggers
 * the first-run experience.
 */
export function useSelectedApplication(): {
  applications: Application[];
  selected: Application | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const query = useApplications();
  const selectedId = useAppStore((state) => state.selectedApplicationId);
  const setSelectedId = useAppStore((state) => state.setSelectedApplicationId);

  const applications = useMemo(() => query.data ?? [], [query.data]);

  const selected = useMemo(() => {
    if (applications.length === 0) return null;
    return applications.find((app) => app.id === selectedId) ?? applications[0];
  }, [applications, selectedId]);

  useEffect(() => {
    if (selected && selected.id !== selectedId) {
      setSelectedId(selected.id);
    }
  }, [selected, selectedId, setSelectedId]);

  return {
    applications,
    selected,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
