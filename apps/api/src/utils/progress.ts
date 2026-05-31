export interface ProgressHandler<T> {
  onProgress?(event: T): void;
}

export function emitProgress<T>(
  handler: ProgressHandler<T> | undefined,
  event: T,
): void {
  handler?.onProgress?.(event);
}

export async function runStep<TStep extends string, TResult>(
  step: TStep,
  handler: ProgressHandler<{ type: "stage"; stage: TStep; status: "started" | "done" }> | undefined,
  run: () => Promise<TResult> | TResult,
): Promise<TResult> {
  emitProgress(handler, { type: "stage", stage: step, status: "started" });
  const result = await run();
  emitProgress(handler, { type: "stage", stage: step, status: "done" });
  return result;
}
