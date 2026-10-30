import { describe, expect, it } from "vitest";
import { isWithinStay, totalCents } from "@/lib/proposals/rules";

const stay = { arrivalDate: "2027-03-15", departureDate: "2027-03-22" };

describe("isWithinStay", () => {
  it.each([
    ["2027-03-15T00:00", true], // first minute of arrival day
    ["2027-03-18T19:30", true],
    ["2027-03-22T23:59", true], // last minute of departure day
    ["2027-03-14T23:59", false],
    ["2027-03-23T00:00", false],
    ["2026-03-18T10:00", false], // right day, wrong year
  ])("%s → %s", (scheduledAt, expected) => {
    expect(isWithinStay(scheduledAt, stay)).toBe(expected);
  });
});

describe("totalCents", () => {
  it("sums item prices and is 0 for no items", () => {
    expect(totalCents([{ priceCents: 125_000 }, { priceCents: 0 }, { priceCents: 49_99 }])).toBe(
      129_999,
    );
    expect(totalCents([])).toBe(0);
  });
});
