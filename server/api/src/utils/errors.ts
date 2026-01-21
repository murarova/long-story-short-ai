const asError = (e: unknown): Error =>
  e instanceof Error ? e : new Error(String(e));

export const errorDetails = (
  e: unknown
): {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
} => {
  const err = asError(e);
  const errWithCause = err as Error & { cause?: unknown };
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    cause: errWithCause.cause,
  };
};
