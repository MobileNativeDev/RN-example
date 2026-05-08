export const safeStringify = (
  value: unknown,
  maxDepth: number = 3,
): string => {
  const seen = new WeakSet<object>();

  const stringify = (input: unknown, depth: number): unknown => {
    if (depth > maxDepth) return '[Max depth reached]';

    if (input === null) return null;
    if (input === undefined) return 'undefined';

    const type = typeof input;
    if (type === 'function') return '[Function]';
    if (type === 'symbol') return input.toString();
    if (type !== 'object') return input;

    if (seen.has(input as object)) return '[Circular]';
    seen.add(input as object);

    if (Array.isArray(input)) {
      return input.map(item => stringify(item, depth + 1));
    }

    const result: Record<string, unknown> = {};
    for (const key in input as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        try {
          result[key] = stringify(
            (input as Record<string, unknown>)[key],
            depth + 1,
          );
        } catch {
          result[key] = '[Error reading property]';
        }
      }
    }

    return result;
  };

  try {
    return JSON.stringify(stringify(value, 0), null, 2);
  } catch {
    return '[Unable to stringify]';
  }
};
