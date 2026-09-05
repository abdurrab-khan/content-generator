import { forwardRef, Module } from '@nestjs/common';
import { ApplicationsModule } from '../applications/applications.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { SourcesModule } from '../sources/sources.module.js';
import { DiscoveryController } from './discovery.controller.js';
import { DiscoveryService } from './discovery.service.js';

@Module({
  imports: [
    ApplicationsModule,
    forwardRef(() => ProjectsModule),
    SourcesModule,
  ],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
