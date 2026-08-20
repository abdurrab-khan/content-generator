import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ClipRendersService } from './clip-renders.service.js';
import {
  createClipRenderSchema,
  type CreateClipRenderDto,
} from './dto/create-clip-render.dto.js';

@ApiTags('clips')
@Controller('clips')
export class ClipRendersController {
  constructor(private readonly renders: ClipRendersService) {}

  @Post(':clipId/renders')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Render a variant of a clip (color grading)',
    description:
      'Creates a render job applying the chosen preset to the cut clip. ' +
      'Idempotent per (clip, preset): resubmitting returns the existing ' +
      'render; a FAILED render is re-queued.',
  })
  @ApiBody({
    schema: z.toJSONSchema(createClipRenderSchema) as Record<string, unknown>,
  })
  submit(
    @Session() session: UserSession,
    @Param('clipId', ParseUUIDPipe) clipId: string,
    @Body(new ZodValidationPipe(createClipRenderSchema))
    dto: CreateClipRenderDto,
  ) {
    return this.renders.submitForUser(session.user.id, clipId, dto);
  }

  @Get(':clipId/renders')
  @ApiOperation({ summary: 'List rendered variants of a clip' })
  list(
    @Session() session: UserSession,
    @Param('clipId', ParseUUIDPipe) clipId: string,
  ) {
    return this.renders.listForClip(session.user.id, clipId);
  }
}
