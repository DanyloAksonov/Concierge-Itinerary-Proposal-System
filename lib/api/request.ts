import type { z } from "zod";
import { DomainError } from "@/lib/errors";

/** Parses and validates a JSON body; malformed JSON and schema failures both become 400s. */
export async function parseBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<z.output<Schema>> {
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
