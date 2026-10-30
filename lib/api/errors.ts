import { unstable_rethrow } from "next/navigation";
import { DomainError, type ErrorCode } from "@/lib/errors";

const HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  CONFLICT: 409,
  RULE_VIOLATION: 422,
  INTERNAL: 500,
};

export function errorResponse(error: unknown): Response {
  if (error instanceof DomainError) {
    return Response.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: HTTP_STATUS[error.code] },
    );
  }
  // Unexpected failure: log it server-side, never leak internals to the client.
  console.error(error);
  return Response.json(
    { error: { code: "INTERNAL", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}

/** Wraps a route handler so every thrown error becomes the standard JSON error response. */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Let Next.js control-flow signals (e.g. connection() bailing out of prerendering) through.
      unstable_rethrow(error);
      return errorResponse(error);
    }
  };
}
