const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatMoney(cents: number): string {
  return usd.format(cents / 100);
}

// Calendar dates (YYYY-MM-DD) are formatted in UTC so the server's own time zone can't shift the day.
const calendarDate = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatStayRange(arrivalDate: string, departureDate: string): string {
  return calendarDate.formatRange(
    new Date(`${arrivalDate}T00:00:00Z`),
    new Date(`${departureDate}T00:00:00Z`),
  );
}
