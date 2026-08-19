import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteVideo } from '../api/endpoints/videos';
import { queryKeys } from './query-keys';

/**
 * Delete a produced video. Videos arrive via the project detail payload, so
 * invalidating the projects prefix refreshes the open detail screen.
 */
export function useDeleteVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectsPrefix });
    },
  });
}
