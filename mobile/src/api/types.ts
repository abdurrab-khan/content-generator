/**
 * API contract types — mirror of the NestJS/Prisma models returned by the
 * backend (DateTime → ISO string, Json → unknown records). Keep in sync with
 * `api/prisma/schema.prisma`.
 */

export type RecordStatus = 'ACTIVE' | 'BIN' | 'DELETED' | 'ERROR';

export type PipelineState =
  | 'CREATED'
  | 'DETAILS_FETCHED'
  | 'FETCHING_TRANSCRIPT'
  | 'TRANSCRIPT_READY'
  | 'ANALYZING'
  | 'CLIPS_READY'
  | 'DOWNLOADING_VIDEO'
  | 'VIDEO_READY'
  | 'CUTTING'
  | 'COMPLETED'
  | 'FAILED';

export type ClipState = 'NOT_STARTED' | 'PENDING' | 'CUTTING' | 'READY' | 'FAILED';

export type RenderState = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export type DownloadState = 'DOWNLOADING' | 'DOWNLOADED' | 'FAILED';

export type SourceType = 'YOUTUBE' | 'TWITCH' | 'UPLOAD';

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string | null;
  description: string | null;
  thumbnail: string | null;
  status: RecordStatus;
  pipelineState: PipelineState;
  sourceType: SourceType;
  sourceUrl: string;
  sourceVideoId: string | null;
  transcriptPath: string | null;
  videoPath: string | null;
  errorMessage: string | null;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
}

/** { title, hook, viralityScore, reason, chunkIndex } — agent-produced. */
export interface ClipInfo {
  title?: string;
  hook?: string;
  viralityScore?: number;
  reason?: string;
  chunkIndex?: number;
}

export interface Clip {
  id: string;
  /** seconds from the start of the source video */
  start: number;
  /** seconds from the start of the source video */
  end: number;
  state: ClipState;
  clipInfo: ClipInfo | null;
  clipPath: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RawVideo {
  id: string;
  title: string | null;
  description: string | null;
  tags: string[];
  videoPath: string | null;
  podcastInfo: Record<string, unknown> | null;
  status: RecordStatus;
  downloadState: DownloadState;
  videoId: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  id: string;
  title: string | null;
  description: string | null;
  tags: string[];
  status: RecordStatus;
  storagePath: string | null;
  /** duration in seconds */
  duration: number | null;
  clipId: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

/** Shared catalog entry — a named FFmpeg filter chain. */
export interface ColorGradingPreset {
  id: string;
  name: string;
  description: string | null;
  /** Raw FFmpeg -vf filter chain (not shown in the UI). */
  filterGraph: string;
  isBuiltIn: boolean;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * One rendered variant of a clip (original clip untouched). Effects beyond
 * color grading (audio, ...) extend this shape later.
 */
export interface ClipRender {
  id: string;
  state: RenderState;
  outputPath: string | null;
  errorMessage: string | null;
  colorGradingPresetId: string | null;
  colorGradingPreset?: { id: string; name: string } | null;
  clipId: string;
  createdAt: string;
  updatedAt: string;
}

/** Clip with its rendered variants (embedded in the project detail payload). */
export interface ClipWithRenders extends Clip {
  renders: ClipRender[];
}

/** GET /api/projects/:id — includes relations. */
export interface ProjectDetail extends Project {
  clips: ClipWithRenders[];
  videos: Video[];
  rawVideos: RawVideo[];
}

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface ListResult<T> {
  items: T[];
  meta: PaginationMeta | null;
}
