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
import { ClipRendersService } from './clip-renders.service.js';

@ApiTags('renders')
@Controller('renders')
export class RendersController {
  constructor(private readonly renders: ClipRendersService) {}

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream/download the rendered variant file' })
  async stream(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { stream, sizeBytes, filename } =
      await this.renders.getStreamForUser(session.user.id, id);
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
    summary: 'Delete a rendered variant',
    description:
      'Removes the variant row and its file. The original clip is never ' +
      'touched.',
  })
  async remove(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.renders.removeForUser(session.user.id, id);
  }
}
