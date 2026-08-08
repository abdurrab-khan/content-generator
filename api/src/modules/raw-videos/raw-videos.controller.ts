import { Controller, Get, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { RawVideosService } from './raw-videos.service.js';

@ApiTags('raw-videos')
@Controller('raw-videos')
export class RawVideosController {
  constructor(private readonly rawVideos: RawVideosService) {}

  @Get()
  @ApiOperation({ summary: 'List raw (downloaded source) videos of a project' })
  findByProject(
    @Session() session: UserSession,
    @Query('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.rawVideos.findByProjectForUser(session.user.id, projectId);
  }
}
