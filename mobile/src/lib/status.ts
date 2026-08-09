import type { ClipState, DownloadState, PipelineState } from '../api/types';
import { colors } from '../theme';

/**
 * Presentation metadata for the various backend state enums — labels,
 * colors and stage ordering for the pipeline progress UI.
 */

export const PIPELINE_STAGES = [
  'Details',
  'Transcript',
  'Analysis',
  'Download',
  'Cutting',
  'Done',
] as const;

const pipelineStageIndexMap: Record<PipelineState, number> = {
  CREATED: 0,
  DETAILS_FETCHED: 0,
  FETCHING_TRANSCRIPT: 1,
  TRANSCRIPT_READY: 1,
  ANALYZING: 2,
  CLIPS_READY: 2,
  DOWNLOADING_VIDEO: 3,
  VIDEO_READY: 3,
  CUTTING: 4,
  COMPLETED: 5,
  FAILED: -1, // rendered specially
};

export function pipelineStageIndex(state: PipelineState): number {
  return pipelineStageIndexMap[state];
}

export const pipelineMeta: Record<PipelineState, { label: string; color: string }> = {
  CREATED: { label: 'Queued', color: colors.textDim },
  DETAILS_FETCHED: { label: 'Details fetched', color: colors.info },
  FETCHING_TRANSCRIPT: { label: 'Fetching transcript', color: colors.info },
  TRANSCRIPT_READY: { label: 'Transcript ready', color: colors.info },
  ANALYZING: { label: 'AI analyzing', color: colors.primaryBright },
  CLIPS_READY: { label: 'Clips identified', color: colors.primaryBright },
  DOWNLOADING_VIDEO: { label: 'Downloading video', color: colors.info },
  VIDEO_READY: { label: 'Video downloaded', color: colors.info },
  CUTTING: { label: 'Cutting clips', color: colors.warning },
  COMPLETED: { label: 'Completed', color: colors.success },
  FAILED: { label: 'Failed', color: colors.danger },
};

export function isPipelineActive(state: PipelineState): boolean {
  return state !== 'COMPLETED' && state !== 'FAILED';
}

export const clipStateMeta: Record<ClipState, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Queued', color: colors.textDim },
  PENDING: { label: 'Pending', color: colors.info },
  CUTTING: { label: 'Cutting', color: colors.warning },
  READY: { label: 'Ready', color: colors.success },
  FAILED: { label: 'Failed', color: colors.danger },
};

export const downloadStateMeta: Record<DownloadState, { label: string; color: string }> = {
  DOWNLOADING: { label: 'Downloading', color: colors.info },
  DOWNLOADED: { label: 'Downloaded', color: colors.success },
  FAILED: { label: 'Failed', color: colors.danger },
};
