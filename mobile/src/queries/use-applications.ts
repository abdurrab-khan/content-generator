import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createApplication, listApplications } from '../api/endpoints/applications';
import { queryKeys } from './query-keys';

export function useApplications() {
  return useQuery({
    queryKey: queryKeys.applications,
    queryFn: listApplications,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.applications });
    },
  });
}
