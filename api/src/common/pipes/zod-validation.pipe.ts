import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { z } from 'zod';

/**
 * Validates request body/query against a zod schema.
 *
 * Usage: `@Body(new ZodValidationPipe(createProjectSchema)) dto: CreateProjectDto`
 */
@Injectable()
export class ZodValidationPipe<Schema extends z.ZodType>
  implements PipeTransform<unknown, z.infer<Schema>>
{
  constructor(private readonly schema: Schema) {}

  transform(value: unknown, metadata: ArgumentMetadata): z.infer<Schema> {
    if (metadata.type !== 'body' && metadata.type !== 'query') {
      return value as z.infer<Schema>;
    }
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
