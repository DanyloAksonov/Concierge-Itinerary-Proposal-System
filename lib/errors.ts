export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "CONFLICT"
  | "RULE_VIOLATION"
  | "INTERNAL";

/** An expected business-rule failure; the API layer maps `code` to an HTTP status. */
export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
