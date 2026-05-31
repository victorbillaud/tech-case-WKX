import { ApiError } from "./client.js";

interface NdjsonHandlers<T> {
  onEvent: (event: T) => void;
  isComplete: (event: T) => boolean;
  getResult: (event: T) => unknown;
  isError: (event: T) => boolean;
  getErrorMessage: (event: T) => string;
  missingResultMessage: string;
}

async function consumeNdjsonStream<T>(
  response: Response,
  handlers: NdjsonHandlers<T>,
): Promise<unknown> {
  if (!response.body) {
    throw new Error("Stream returned no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: unknown;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as T;
    handlers.onEvent(event);
    if (handlers.isComplete(event)) {
      result = handlers.getResult(event);
    }
    if (handlers.isError(event)) {
      throw new Error(handlers.getErrorMessage(event));
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      handleLine(line);
    }
  }

  if (buffer.trim()) {
    handleLine(buffer);
  }

  if (result === undefined) {
    throw new Error(handlers.missingResultMessage);
  }

  return result;
}

export async function readNdjsonStream<TEvent, TResult>(
  response: Response,
  onEvent: (event: TEvent) => void,
  handlers: {
    isComplete: (event: TEvent) => boolean;
    getResult: (event: TEvent) => TResult;
    isError: (event: TEvent) => boolean;
    getErrorMessage: (event: TEvent) => string;
    missingResultMessage: string;
  },
): Promise<TResult> {
  return consumeNdjsonStream(response, {
    onEvent,
    ...handlers,
  }) as Promise<TResult>;
}

export async function fetchNdjsonStream<TEvent, TResult>(
  url: string,
  init: RequestInit | undefined,
  onEvent: (event: TEvent) => void,
  handlers: {
    isComplete: (event: TEvent) => boolean;
    getResult: (event: TEvent) => TResult;
    isError: (event: TEvent) => boolean;
    getErrorMessage: (event: TEvent) => string;
    missingResultMessage: string;
  },
): Promise<TResult> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : response.statusText;
    throw new ApiError(message, response.status, body);
  }

  return readNdjsonStream(response, onEvent, handlers);
}
