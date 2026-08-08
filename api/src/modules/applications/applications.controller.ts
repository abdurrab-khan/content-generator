import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ApplicationsService } from './applications.service.js';
import {
  createApplicationSchema,
  type CreateApplicationDto,
} from './dto/create-application.dto.js';

@ApiTags('applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'List my applications (content ideas)' })
  findAll(@Session() session: UserSession) {
    return this.applications.findAllForUser(session.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an application' })
  @ApiBody({ schema: z.toJSONSchema(createApplicationSchema) as Record<string, unknown> })
  create(
    @Session() session: UserSession,
    @Body(new ZodValidationPipe(createApplicationSchema)) dto: CreateApplicationDto,
  ) {
    return this.applications.createForUser(session.user.id, dto);
  }
}
