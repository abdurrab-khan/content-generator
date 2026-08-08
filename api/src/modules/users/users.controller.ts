import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

@ApiTags('users')
@Controller('users')
export class UsersController {
  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user' })
  me(@Session() session: UserSession) {
    return { user: session.user };
  }
}
