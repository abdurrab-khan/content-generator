import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ProjectsService } from '../projects/projects.service.js';
import { DiscoveryService } from './discovery.service.js';
import {
  listPodcastersQuerySchema,
  listPodcastsQuerySchema,
  notInterestedSchema,
  usePodcastSchema,
  type ListPodcastersQuery,
  type ListPodcastsQuery,
  type NotInterestedDto,
  type UsePodcastDto,
} from './dto/discovery.dto.js';

@ApiTags('discovery')
@Controller('discovery')
export class DiscoveryController {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly projects: ProjectsService,
  ) {}

  @Get('podcasters')
  @ApiOperation({
    summary: 'Curated podcaster catalog for an application language',
  })
  listPodcasters(
    @Session() session: UserSession,
    @Query(new ZodValidationPipe(listPodcastersQuerySchema))
    query: ListPodcastersQuery,
  ) {
    return this.discovery.listPodcasters(session.user.id, query);
  }

  @Get('podcasts')
  @ApiOperation({
    summary: 'Find trending / all-time popular podcast episodes',
    description: 'Returns the existing podcast from the database',
  })
  findPodcasts(
    @Session() session: UserSession,
    @Query(new ZodValidationPipe(listPodcastsQuerySchema))
    query: ListPodcastsQuery,
  ) {
    return this.discovery.findPodcasts(session.user.id, query);
  }

  @Post('podcasts/refetch')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Refetch the podcast again based on the query',
    description:
      'Searches YouTube for the podcasters of the application language. ' +
      'mode=popular ranks all-time most-viewed episodes; mode=trending ' +
      'surfaces recent episodes ranked by views. Videos already used for a ' +
      'project or marked "not interested" are never returned.',
  })
  refetchPodcasts(
    @Session() session: UserSession,
    @Query(new ZodValidationPipe(listPodcastsQuerySchema))
    query: ListPodcastsQuery,
  ) {
    void this.discovery.refetchPodcasts(session.user.id, query);
    return;
  }

  @Post('podcasts/not-interested')
  @ApiOperation({
    summary: 'Never suggest this video again ("not interested" cache)',
  })
  @ApiBody({
    schema: z.toJSONSchema(notInterestedSchema) as Record<string, unknown>,
  })
  notInterested(
    @Session() session: UserSession,
    @Body(new ZodValidationPipe(notInterestedSchema)) dto: NotInterestedDto,
  ) {
    return this.discovery.markNotInterested(session.user.id, dto);
  }

  @Post('podcasts/use')
  @ApiOperation({
    summary: 'Create a project from a discovered podcast ("make clips")',
    description:
      'Runs the normal project pipeline (transcript → analysis → cutting) ' +
      'and records the video as USED so it is never suggested again.',
  })
  @ApiBody({
    schema: z.toJSONSchema(usePodcastSchema) as Record<string, unknown>,
  })
  usePodcast(
    @Session() session: UserSession,
    @Body(new ZodValidationPipe(usePodcastSchema)) dto: UsePodcastDto,
  ) {
    // ProjectsService.create() records the video as USED in the discovery
    // cache itself, so one call covers the whole flow.
    return this.projects.create(session.user.id, {
      url: dto.url,
      applicationId: dto.applicationId,
    });
  }
}
