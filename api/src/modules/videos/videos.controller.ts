import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { VideosService } from './videos.service.js';

@ApiTags('videos')
@Controller('videos')
export class VideosController {
  constructor(private readonly videos: VideosService) {}

  @Get()
  @ApiOperation({ summary: 'List my produced videos' })
  findAll(@Session() session: UserSession) {
    return this.videos.findAllForUser(session.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one video' })
  findOne(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.videos.findOneForUser(session.user.id, id);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream/download the video file' })
  async stream(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { stream, sizeBytes, filename } = await this.videos.getStreamForUser(
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Permanently delete a video',
    description:
      'Removes the video row and its file. When the clip it was cut from ' +
      'shares the same file (podcast flow), that clip is deleted too.',
  })
  async remove(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.videos.removeForUser(session.user.id, id);
  }
}
