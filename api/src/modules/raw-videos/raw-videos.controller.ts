import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
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

  @Get(':id')
  @ApiOperation({ summary: 'Get one raw video' })
  findOne(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rawVideos.findOneForUser(session.user.id, id);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream/download the raw source video file' })
  async stream(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { stream, sizeBytes, filename } = await this.rawVideos.getStreamForUser(
      session.user.id,
      id,
    );
    response.set({
      'Content-Type': 'video/mp4',
      'Content-Length': sizeBytes,
      'Content-Disposition': `inline; filename="${filename}"`,
    });
    return new StreamableFile(stream);
  }
}
