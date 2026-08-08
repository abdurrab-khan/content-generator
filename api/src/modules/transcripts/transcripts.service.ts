import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { parseVtt } from '../../common/utils/vtt-parser.js';
import { PipelineState } from '../../generated/prisma/client.js';
import { SourceRegistryService } from '../sources/source-registry.service.js';
import { StorageFolder } from '../storage/interfaces/storage.interface.js';
import { LocalStorageService } from '../storage/providers/local-storage.service.js';
import { ChunkingService, type TranscriptChunk } from './chunking.service.js';

@Injectable()
export class TranscriptsService {
  private readonly logger = new Logger(TranscriptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
    private readonly sources: SourceRegistryService,
    private readonly chunking: ChunkingService,
  ) {}

  /**
   * Download subtitles for a project, store the .vtt and return the chunks.
   * Returns null when the source has no subtitles at all.
   */
  async fetchAndChunk(
    projectId: string,
  ): Promise<{ transcriptPath: string; chunks: TranscriptChunk[] } | null> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const provider = this.sources.getProviderByType(project.sourceType);
    if (!provider) {
      throw new InternalServerErrorException(
        `No provider registered for source type ${project.sourceType}`,
      );
    }

    const destDir = await this.storage.ensureDir(StorageFolder.TRANSCRIPTS, projectId);
    const vttPath = await provider.downloadSubtitles(project.sourceUrl, destDir);
    if (!vttPath) {
      this.logger.warn(`No subtitles available for project ${projectId}`);
      return null;
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        transcriptPath: this.storage.relative(vttPath),
        pipelineState: PipelineState.TRANSCRIPT_READY,
      },
    });

    const chunks = await this.loadChunks(projectId);
    return { transcriptPath: vttPath, chunks };
  }

  /**
   * Re-derive chunks from the stored .vtt. Job payloads only carry the
   * projectId + chunkIndex — analysis workers call this to get the text.
   */
  async loadChunks(projectId: string): Promise<TranscriptChunk[]> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project?.transcriptPath) {
      throw new NotFoundException(`Project ${projectId} has no transcript`);
    }
    const absolute = this.storage.resolve(project.transcriptPath);
    const content = await this.storage.readText(absolute);
    const cues = parseVtt(content);
    if (cues.length === 0) {
      throw new InternalServerErrorException(
        `Transcript for project ${projectId} parsed to zero cues`,
      );
    }
    return this.chunking.chunkCues(cues);
  }
}
