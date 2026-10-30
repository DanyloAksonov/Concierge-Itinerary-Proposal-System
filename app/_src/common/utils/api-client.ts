import type { ErrorCode } from "@/domain/errors";

/** An error response from our own API, with the server's code and message preserved. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Calls one of our JSON endpoints from the browser; throws ApiError on any non-2xx response. */
export async function apiRequest<T>(
  path: string,
  { method = "GET", body }: { method?: "GET" | "POST" | "PATCH"; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "INTERNAL", "Can't reach the server. Check your connection and try again.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "INTERNAL",
      error?.message ?? "Something went wrong. Please try again.",
      error?.details,
    );
  }
  return payload as T;
}

/** A message safe to show the user: the API's own message, or a generic fallback. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}
