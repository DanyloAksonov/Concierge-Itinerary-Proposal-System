import { describe, expect, it } from "vitest";
import {
  formatClockTime,
  formatMoney,
  formatShortDay,
  formatStayRange,
  formatTimestamp,
  formatTripDate,
  parseDollarsToCents,
} from "@/lib/format";

describe("parseDollarsToCents", () => {
  it.each([
    ["1250", 125_000],
    ["1,250.50", 125_050],
    ["$1,250.5", 125_050],
    ["  0 ", 0],
    ["0.99", 99],
  ])("%s → %i cents", (input, cents) => {
    expect(parseDollarsToCents(input)).toBe(cents);
  });

  it.each(["", "-5", "12.345", "abc", "1.2.3", "$"])("rejects %j", (input) => {
    expect(parseDollarsToCents(input)).toBeNull();
  });
});

// Intl output uses thin / narrow no-break spaces (e.g. "7:00\u202fPM"); compare with plain spaces.
const plain = (text: string) => text.replace(/[\u2009\u202f]/g, " ");

describe("display formatting", () => {
  it("formats money, days, times and the stay range without shifting time zones", () => {
    expect(formatMoney(125_050)).toBe("$1,250.50");
    expect(formatShortDay("2027-03-15")).toBe("Mon, Mar 15");
    expect(formatTripDate("2027-03-22")).toBe("Mon, Mar 22, 2027");
    expect(plain(formatClockTime("2027-03-16T19:00"))).toBe("7:00 PM");
    expect(plain(formatStayRange("2027-03-15", "2027-03-22"))).toBe("March 15 – 22, 2027");
  });

  it("shows audit timestamps in the destination's time zone", () => {
    // 14:13 UTC is 08:13 in Punta Mita (UTC-6, no daylight saving).
    expect(plain(formatTimestamp("2026-10-30T14:13:00.000Z", "America/Bahia_Banderas"))).toBe(
      "Oct 30, 8:13 AM",
    );
  });
});
