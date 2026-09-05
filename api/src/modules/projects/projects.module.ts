import { forwardRef, Module } from '@nestjs/common';
import { JobsModule } from '../../jobs/jobs.module.js';
import { ApplicationsModule } from '../applications/applications.module.js';
import { ClipsModule } from '../clips/clips.module.js';
import { DiscoveryModule } from '../discovery/discovery.module.js';
import { SourcesModule } from '../sources/sources.module.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  imports: [
    SourcesModule,
    ApplicationsModule,
    ClipsModule,
    JobsModule,
    forwardRef(() => DiscoveryModule),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
