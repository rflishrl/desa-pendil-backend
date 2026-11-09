type Level = "info" | "warn" | "error";

function describe(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.cause !== undefined && { cause: describe(error.cause) }),
    };
  }
  return error;
}

/** Emits single-line JSON logs to simplify correlation by `requestId` in log drains. */
export function log(level: Level, message: string, fields: Record<string, unknown> = {}): void {
  const entry = JSON.stringify({
    level,
    message,
    ...fields,
    ...("error" in fields && { error: describe(fields.error) }),
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}
