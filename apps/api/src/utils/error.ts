/** Format an unknown thrown value as a human-readable error message. */
export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Run a parser; on failure append to `errors` and return an empty array. */
export function tryParse<T>(
  fn: () => T[],
  context: string,
  errors: string[],
): T[] {
  try {
    return fn();
  } catch (err) {
    errors.push(`${context}: ${describeError(err)}`);
    return [];
  }
}
