import { Injectable, Logger } from '@nestjs/common';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { tool } from 'langchain';
import { z } from 'zod';
import {
  secondsToTimestamp,
  tryTimestampToSeconds,
} from '../../../common/utils/time.utils.js';
import { ClipsService } from '../../clips/clips.service.js';
import { extractedClipSchema } from '../schemas/extracted-clip.schema.js';

export interface AnalysisContext {
  projectId: string;
  projectTitle: string;
  projectDescription: string | null;
  chunkIndex: number;
  chunkStartSeconds: number;
  chunkEndSeconds: number;
}

export interface BuiltAnalysisTools {
  tools: StructuredToolInterface[];
  /** How many clips the agent actually saved during this run. */
  getSavedCount: () => number;
}

/**
 * Tools are created per analysis run and close over the run context —
 * the agent can only ever save clips for its own project/chunk window.
 * Adding a tool = adding an entry here; the agent service never changes.
 */
@Injectable()
export class AnalysisToolsFactory {
  private readonly logger = new Logger(AnalysisToolsFactory.name);

  constructor(private readonly clips: ClipsService) {}

  build(context: AnalysisContext): BuiltAnalysisTools {
    let savedCount = 0;

    const getProjectContext = tool(
      async () =>
        JSON.stringify({
          title: context.projectTitle,
          description: context.projectDescription ?? '(no description)',
          chunkWindow: `${secondsToTimestamp(context.chunkStartSeconds)} - ${secondsToTimestamp(
            context.chunkEndSeconds,
          )}`,
        }),
      {
        name: 'get_project_context',
        description:
          'Get the podcast title/description and the current chunk window.',
        schema: z.object({}),
      },
    );

    const saveClip = tool(
      async (input) => {
        const start = tryTimestampToSeconds(input.start);
        const end = tryTimestampToSeconds(input.end);
        if (start === null || end === null) {
          return 'ERROR: start/end must be HH:MM:SS timestamps copied from transcript lines.';
        }
        if (end <= start) {
          return 'ERROR: end must be after start.';
        }
        if (
          start < context.chunkStartSeconds - 60 ||
          end > context.chunkEndSeconds + 60
        ) {
          return `ERROR: clip must be inside the chunk window ${secondsToTimestamp(
            context.chunkStartSeconds,
          )} - ${secondsToTimestamp(context.chunkEndSeconds)}.`;
        }

        await this.clips.createFromAgent(
          context.projectId,
          context.chunkIndex,
          {
            start,
            end,
            title: input.title,
            hook: input.hook,
            viralityScore: input.viralityScore,
            reason: input.reason,
          },
        );
        savedCount += 1;
        this.logger.log(
          `Clip saved: ${secondsToTimestamp(start)}-${secondsToTimestamp(end)} ` +
            `(score ${input.viralityScore}) project=${context.projectId}`,
        );
        return 'Clip saved.';
      },
      {
        name: 'save_clip',
        description:
          'Save one viral moment as a clip candidate. Use absolute HH:MM:SS timestamps ' +
          'copied from the transcript lines. Max 5 clips per chunk.',
        schema: extractedClipSchema,
      },
    );

    return {
      tools: [getProjectContext, saveClip],
      getSavedCount: () => savedCount,
    };
  }
}
