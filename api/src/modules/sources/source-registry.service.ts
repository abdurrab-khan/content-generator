import { Inject, Injectable } from '@nestjs/common';
import type { SourceType } from '../../generated/prisma/client.js';
import {
  VIDEO_SOURCE_PROVIDERS,
  type VideoSourceProvider,
} from './interfaces/video-source-provider.interface.js';

/** Resolves URLs / source types to the right provider implementation. */
@Injectable()
export class SourceRegistryService {
  constructor(
    @Inject(VIDEO_SOURCE_PROVIDERS)
    private readonly providers: VideoSourceProvider[],
  ) {}

  getProviderForUrl(url: string): VideoSourceProvider | null {
    return this.providers.find((provider) => provider.supports(url)) ?? null;
  }

  getProviderByType(type: SourceType): VideoSourceProvider | null {
    return this.providers.find((provider) => provider.type === type) ?? null;
  }
}
