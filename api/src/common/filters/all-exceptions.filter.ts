import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/**
 * Maps Prisma driver-adapter errors to HTTP semantics without depending on
 * generated client internals (duck-typed on the `code` property).
 *  - P2002 unique constraint  -> 409
 *  - P2003 foreign key        -> 409
 *  - P2025 record not found   -> 404
 */
function mapPrismaError(
  exception: { code: string; meta?: { modelName?: string } },
): { status: number; message: string } | null {
  switch (exception.code) {
    case 'P2002':
      return { status: HttpStatus.CONFLICT, message: 'Resource already exists' };
    case 'P2003':
      return { status: HttpStatus.CONFLICT, message: 'Related resource constraint violation' };
    case 'P2025': {
      const model = exception.meta?.modelName ?? 'Resource';
      return { status: HttpStatus.NOT_FOUND, message: `${model} not found` };
    }
    default:
      return null;
  }
}

function isPrismaKnownError(
  exception: unknown,
): exception is { code: string; meta?: { modelName?: string } } {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    'code' in exception &&
    typeof (exception as { code: unknown }).code === 'string' &&
    /^P\d{4}$/.test((exception as { code: string }).code)
  );
}

/** Single global filter producing a uniform error envelope. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const record = body as Record<string, unknown>;
        message = (record.message as string | string[]) ?? exception.message;
        error = (record.error as string) ?? exception.name;
      }
    } else if (isPrismaKnownError(exception)) {
      const mapped = mapPrismaError(exception);
      if (mapped) {
        status = mapped.status;
        message = mapped.message;
        error = 'PrismaError';
      } else {
        this.logger.error(`Unhandled Prisma error ${exception.code}`, undefined);
      }
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      'status' in exception &&
      typeof (exception as { status: unknown }).status === 'number'
    ) {
      // e.g. body-parser errors
      status = (exception as { status: number }).status;
      message = exception instanceof Error ? exception.message : message;
      error = 'HttpError';
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };
    response.status(status).json(body);
  }
}
