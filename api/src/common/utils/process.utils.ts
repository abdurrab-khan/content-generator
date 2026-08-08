/**
 * Extract a useful message from a failed execa call without depending on
 * execa's error classes (type-only exports in v8).
 */
export function execFailureMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.stderr === 'string' && record.stderr.trim().length > 0) {
      return record.stderr;
    }
    if (typeof record.shortMessage === 'string') {
      return record.shortMessage;
    }
  }
  return error instanceof Error ? error.message : String(error);
}
