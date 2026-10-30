import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseBody, requestOrigin } from "@/lib/api/request";

const schema = z.strictObject({ reservationId: z.number().int().positive() });

const post = (body: string, contentType: string | null = "application/json") =>
  new Request("http://localhost:3000/api/proposals", {
    method: "POST",
    body,
    headers: contentType ? { "content-type": contentType } : {},
  });

describe("parseBody", () => {
  it("returns the validated body", async () => {
    await expect(parseBody(post('{"reservationId":1}'), schema)).resolves.toEqual({
      reservationId: 1,
    });
  });

  it("accepts a charset parameter and any letter case in the content type", async () => {
    const request = post('{"reservationId":1}', "Application/JSON; charset=utf-8");

    await expect(parseBody(request, schema)).resolves.toEqual({ reservationId: 1 });
  });

  it.each([
    ["text/plain (what a cross-site form can send)", "text/plain"],
    ["a form body", "application/x-www-form-urlencoded"],
    ["no content type", null],
  ])("rejects %s with UNSUPPORTED_MEDIA_TYPE", async (_label, contentType) => {
    await expect(parseBody(post('{"reservationId":1}', contentType), schema)).rejects.toMatchObject(
      { code: "UNSUPPORTED_MEDIA_TYPE" },
    );
  });

  it("rejects malformed JSON with VALIDATION_ERROR", async () => {
    await expect(parseBody(post('{"reservationId":'), schema)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Request body must be valid JSON.",
    });
  });

  it("lists each failing field with its path", async () => {
    await expect(parseBody(post('{"reservationId":-1,"extra":true}'), schema)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: {
        issues: expect.arrayContaining([
          expect.objectContaining({ path: "reservationId" }),
          expect.objectContaining({ path: "" }), // unknown key "extra"
        ]),
      },
    });
  });
});

describe("requestOrigin", () => {
  it("returns scheme, host and port of the request", () => {
    expect(requestOrigin(post("{}"))).toBe("http://localhost:3000");
  });
});
