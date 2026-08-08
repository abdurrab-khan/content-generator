import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { SKIP_TRANSFORM_KEY } from '../decorators/skip-transform.decorator.js';

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Wraps every response in a `{ data, meta? }` envelope.
 * Convention: services returning `{ items, total, page, pageSize }` get
 * `items` as `data` and the rest moved into `meta` (pagination).
 * Streams (`StreamableFile`) and `@SkipTransform()` handlers pass through.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();

    return next.handle().pipe(
      map((payload: unknown) => {
        if (payload instanceof StreamableFile) return payload;
        if (payload === null || payload === undefined) return { data: payload };

        if (
          typeof payload === 'object' &&
          'items' in payload &&
          'total' in payload
        ) {
          const { items, total, ...rest } = payload as Record<string, unknown>;
          return {
            data: items,
            meta: { total, ...rest },
          } satisfies ApiEnvelope<unknown>;
        }

        return { data: payload } satisfies ApiEnvelope<unknown>;
      }),
    );
  }
}
