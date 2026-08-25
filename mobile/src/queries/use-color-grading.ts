import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createClipRender,
  deleteClipRender,
  listClipRenders,
  listColorGradingPresets,
} from '../api/endpoints/color-grading';
import { isRenderInFlight } from '../lib/status';
import { toast } from '../store/toast-store';
import { queryKeys } from './query-keys';

/** Shared preset catalog — effectively static, cached aggressively. */
export function useColorGradingPresets() {
  return useQuery({
    queryKey: queryKeys.colorGradingPresets,
    queryFn: listColorGradingPresets,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Rendered variants of a clip. Polls every 3s while any render is
 * queued/processing, then settles.
 */
export function useClipRenders(clipId: string) {
  return useQuery({
    queryKey: queryKeys.clipRenders(clipId),
    queryFn: () => listClipRenders(clipId),
    refetchInterval: (query) =>
      query.state.data?.some((render) => isRenderInFlight(render.state))
        ? 3000
        : false,
  });
}

export function useCreateClipRender(clipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (presetId: string) => createClipRender(clipId, presetId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.clipRenders(clipId),
      });
      toast.success(
        result.queued
          ? 'Grading started — the variant appears below when ready'
          : 'That variant already exists',
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Grading failed');
    },
  });
}

export function useDeleteClipRender(clipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (renderId: string) => deleteClipRender(renderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.clipRenders(clipId),
      });
      toast.success('Variant deleted');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    },
  });
}
