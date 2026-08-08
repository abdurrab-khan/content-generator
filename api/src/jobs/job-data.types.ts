export interface TranscriptJobData {
  projectId: string;
}

export interface VideoDownloadJobData {
  projectId: string;
}

export interface AnalyzeChunkJobData {
  projectId: string;
  chunkIndex: number;
}

export interface AnalyzeProjectJobData {
  projectId: string;
}

export interface CutClipJobData {
  clipId: string;
}
