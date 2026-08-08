import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_KEY = 'skipTransform';

/** Opt a route out of the global `{ data, meta }` response envelope. */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
