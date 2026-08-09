import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ClipsService } from './clips.service.js';
import { updateClipSchema, type UpdateClipDto } from './dto/update-clip.dto.js';

@ApiTags('clips')
@Controller('clips')
export class ClipsController {
  constructor(private readonly clips: ClipsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get one clip by id' })
  findOne(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clips.findOneForUser(session.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a clip (title/start/end); edits schedule a re-cut',
  })
  update(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateClipSchema)) dto: UpdateClipDto,
  ) {
    return this.clips.updateForUser(session.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a clip' })
  async remove(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.clips.removeForUser(session.user.id, id);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream/download the cut clip file' })
  async stream(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { stream, sizeBytes, filename } = await this.clips.getStreamForUser(
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
