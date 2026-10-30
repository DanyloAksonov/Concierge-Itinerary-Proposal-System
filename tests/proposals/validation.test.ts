import { describe, expect, it } from "vitest";
import {
  createProposalSchema,
  itemInputSchema,
  updateProposalSchema,
} from "@/lib/proposals/validation";

const item = {
  category: "DINING",
  title: "Private chef dinner",
  scheduledAt: "2027-03-16T19:00",
  priceCents: 120_000,
};

describe("itemInputSchema", () => {
  it("accepts a valid item and defaults the description", () => {
    expect(itemInputSchema.parse(item)).toEqual({ ...item, description: "" });
  });

  it.each([
    ["unknown category", { category: "NIGHTLIFE" }],
    ["blank title", { title: "   " }],
    ["date without time", { scheduledAt: "2027-03-16" }],
    ["impossible date", { scheduledAt: "2027-02-30T10:00" }],
    ["impossible time", { scheduledAt: "2027-03-16T24:00" }],
    ["negative price", { priceCents: -1 }],
    ["fractional cents", { priceCents: 10.5 }],
    ["unknown field", { currency: "EUR" }],
  ])("rejects %s", (_label, override) => {
    expect(itemInputSchema.safeParse({ ...item, ...override }).success).toBe(false);
  });
});

describe("createProposalSchema", () => {
  it("rejects a client-supplied concierge — the server decides who is acting", () => {
    expect(
      createProposalSchema.safeParse({ reservationId: 1, conciergeId: 2, items: [] }).success,
    ).toBe(false);
  });

  it("defaults items to [] and turns an empty note into null", () => {
    expect(createProposalSchema.parse({ reservationId: 1, note: "  " })).toEqual({
      reservationId: 1,
      note: null,
      items: [],
    });
  });
});

describe("updateProposalSchema", () => {
  it("accepts a status change or a content edit", () => {
    expect(updateProposalSchema.safeParse({ status: "approved" }).success).toBe(true);
    expect(updateProposalSchema.safeParse({ note: "Welcome!", items: [item] }).success).toBe(true);
  });

  it("rejects mixing status with content, and empty bodies", () => {
    expect(updateProposalSchema.safeParse({ status: "sent", note: "x" }).success).toBe(false);
    expect(updateProposalSchema.safeParse({}).success).toBe(false);
  });
});
