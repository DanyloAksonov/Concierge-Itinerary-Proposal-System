const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatMoney(cents: number): string {
  return usd.format(cents / 100);
}

/**
 * Parses what a person types into a USD price field ("1250", "1,250.50", "$1,250.5") into cents.
 * Returns null for anything that isn't a non-negative amount with at most two decimals.
 */
export function parseDollarsToCents(input: string): number | null {
  const normalized = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [dollars, fraction = ""] = normalized.split(".");
  return Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
}

// Calendar dates (YYYY-MM-DD) and wall-clock times are formatted in UTC so the server's own time
// zone can't shift them; they are already destination-local.
const calendarDate = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const shortDay = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const clockTime = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatStayRange(arrivalDate: string, departureDate: string): string {
  return calendarDate.formatRange(
    new Date(`${arrivalDate}T00:00:00Z`),
    new Date(`${departureDate}T00:00:00Z`),
  );
}

const tripDate = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** "2027-03-15" → "Mon, Mar 15, 2027" */
export function formatTripDate(date: string): string {
  return tripDate.format(new Date(`${date}T00:00:00Z`));
}

const longDay = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** ("2027-03-15", "2027-03-18") → "Mar 15 – 18"; one day → "Mar 15". */
export function formatDaySpan(firstDay: string, lastDay: string): string {
  const first = new Date(`${firstDay}T00:00:00Z`);
  return firstDay === lastDay
    ? monthDay.format(first)
    : monthDay.formatRange(first, new Date(`${lastDay}T00:00:00Z`));
}

/** "2027-03-15" → "Monday, March 15" */
export function formatLongDay(date: string): string {
  return longDay.format(new Date(`${date}T00:00:00Z`));
}

/** "2027-03-15" → "Mon, Mar 15" */
export function formatShortDay(date: string): string {
  return shortDay.format(new Date(`${date}T00:00:00Z`));
}

/** "2027-03-16T19:00" → "7:00 PM" (wall-clock time, no zone conversion) */
export function formatClockTime(scheduledAt: string): string {
  return clockTime.format(new Date(`${scheduledAt}:00Z`));
}

/** An audit timestamp (UTC ISO) shown in a given IANA zone, e.g. "Oct 30, 2:13 PM". */
export function formatTimestamp(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}
