import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

const schema = z.object({
  url: z.url(),
  limit: z.coerce.number().default(10),
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(schema);

  it('parses and returns the inferred value (with defaults/coercion)', () => {
    const result = pipe.transform(
      { url: 'https://www.youtube.com/watch?v=x', limit: '5' },
      { type: 'body' },
    );
    expect(result).toEqual({
      url: 'https://www.youtube.com/watch?v=x',
      limit: 5,
    });
  });

  it('throws BadRequestException with issues on invalid input', () => {
    try {
      pipe.transform({ url: 'nope' }, { type: 'body' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        message: string;
        issues: { path: string; message: string }[];
      };
      expect(response.message).toBe('Validation failed');
      expect(response.issues[0].path).toBe('url');
    }
  });

  it('passes through non-body/query metadata untouched', () => {
    const value = { whatever: true };
    expect(pipe.transform(value, { type: 'param' })).toBe(value);
  });
});
