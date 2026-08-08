import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = request;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () =>
          this.logger.log(
            `${method} ${originalUrl} +${Date.now() - startedAt}ms`,
          ),
        error: () =>
          this.logger.warn(
            `${method} ${originalUrl} failed +${Date.now() - startedAt}ms`,
          ),
      }),
    );
  }
}
