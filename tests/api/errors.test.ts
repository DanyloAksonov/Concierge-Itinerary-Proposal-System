import { afterEach, describe, expect, it, vi } from "vitest";
import { errorResponse, withErrorHandling } from "@/lib/api/errors";
import { DomainError, type ErrorCode } from "@/lib/errors";

afterEach(() => vi.restoreAllMocks());

describe("errorResponse", () => {
  it.each<[ErrorCode, number]>([
    ["VALIDATION_ERROR", 400],
    ["NOT_FOUND", 404],
    ["UNSUPPORTED_MEDIA_TYPE", 415],
    ["INVALID_TRANSITION", 409],
    ["CONFLICT", 409],
    ["RULE_VIOLATION", 422],
    ["INTERNAL", 500],
  ])("maps %s to HTTP %i with the standard error body", async (code, status) => {
    const response = errorResponse(new DomainError(code, "Something specific.", { field: "x" }));

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({
      error: { code, message: "Something specific.", details: { field: "x" } },
    });
  });

  it("turns unexpected errors into a generic 500 without leaking their message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const crash = new Error("SQLITE_CORRUPT: database disk image is malformed");

    const response = errorResponse(crash);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: { code: "INTERNAL", message: "Something went wrong. Please try again." },
    });
    expect(JSON.stringify(body)).not.toContain("SQLITE");
    expect(log).toHaveBeenCalledWith(crash); // still visible in the server log
  });
});

describe("withErrorHandling", () => {
  it("passes successful responses through untouched", async () => {
    const handler = withErrorHandling(async () => Response.json({ ok: true }, { status: 201 }));

    const response = await handler();

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("converts a thrown DomainError into its HTTP response", async () => {
    const handler = withErrorHandling(async () => {
      throw new DomainError("NOT_FOUND", "Proposal not found.");
    });

    expect((await handler()).status).toBe(404);
  });

  it("rethrows Next.js control-flow errors instead of answering 500", async () => {
    // notFound() throws an internal error that Next must handle itself (see unstable_rethrow).
    const { notFound } = await import("next/navigation");
    const handler = withErrorHandling(async () => notFound());

    await expect(handler()).rejects.toThrow();
  });
});
