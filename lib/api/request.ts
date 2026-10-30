import type { z } from "zod";
import { DomainError } from "@/lib/errors";

// A cross-site HTML form can only send form, multipart or text/plain bodies without a CORS
// preflight, so requiring application/json shuts that door before cookie-based auth exists.
function isJson(request: Request): boolean {
  const mediaType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  return mediaType === "application/json";
}

/**
 * Parses and validates a JSON body: a non-JSON content type is a 415, malformed JSON and schema
 * failures are 400s.
 */
export async function parseBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<z.output<Schema>> {
  if (!isJson(request)) {
    throw new DomainError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Send the request body as JSON with the header Content-Type: application/json.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new DomainError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new DomainError("VALIDATION_ERROR", "Request body is invalid.", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return result.data;
}

/** Origin the request came in on — used to build absolute member links in emails. */
export function requestOrigin(request: Request): string {
  return new URL(request.url).origin;
}
