import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ClipsService } from '../clips/clips.service.js';
import {
  createProjectSchema,
  listProjectsQuerySchema,
  type CreateProjectDto,
  type ListProjectsQuery,
} from './dto/project.dto.js';
import { ProjectsService } from './projects.service.js';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly clips: ClipsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a project from a video URL',
    description:
      'Fetches video details synchronously (404 when unavailable), then runs ' +
      'transcript/download/analysis/cutting in the background.',
  })
  @ApiBody({
    schema: z.toJSONSchema(createProjectSchema) as Record<string, unknown>,
  })
  create(
    @Session() session: UserSession,
    @Body(new ZodValidationPipe(createProjectSchema)) dto: CreateProjectDto,
  ) {
    return this.projects.create(session.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my projects (paginated)' })
  findAll(
    @Session() session: UserSession,
    @Query(new ZodValidationPipe(listProjectsQuerySchema))
    query: ListProjectsQuery,
  ) {
    return this.projects.findAllForUser(session.user.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Project detail incl. clips, raw videos and outputs',
  })
  findOne(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projects.findOneForUser(session.user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a project (moves to bin)' })
  async remove(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.projects.removeForUser(session.user.id, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a project from the bin (back to active)' })
  restore(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projects.restoreForUser(session.user.id, id);
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Permanently delete a binned project',
    description:
      'Hard-deletes the project row (cascades to clips, raw videos and ' +
      'videos) and removes the files from storage. Only allowed when the ' +
      'project is in the bin.',
  })
  async removePermanently(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.projects.permanentlyDeleteForUser(session.user.id, id);
  }

  @Get(':id/clips')
  @ApiOperation({ summary: 'List clips of a project' })
  findClips(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clips.findByProjectForUser(session.user.id, id);
  }
}
