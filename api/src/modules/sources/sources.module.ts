import { Module } from '@nestjs/common';
import { VIDEO_SOURCE_PROVIDERS } from './interfaces/video-source-provider.interface.js';
import { YoutubeProvider } from './providers/youtube/youtube.provider.js';
import { SourceRegistryService } from './source-registry.service.js';
import { YtDlpService } from './ytdlp/yt-dlp.service.js';

@Module({
  providers: [
    YtDlpService,
    SourceRegistryService,
    // Extension point: register future providers (Twitch, upload, ...) as
    // normal providers and add them to this factory's array.
    YoutubeProvider,
    {
      provide: VIDEO_SOURCE_PROVIDERS,
      useFactory: (youtube: YoutubeProvider) => [youtube],
      inject: [YoutubeProvider],
    },
  ],
  exports: [SourceRegistryService, YtDlpService],
})
export class SourcesModule {}
