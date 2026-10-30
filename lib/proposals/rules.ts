type Stay = { arrivalDate: string; departureDate: string };

/**
 * Both arrival and departure days count as part of the stay. Dates are destination-local strings
 * (YYYY-MM-DD / YYYY-MM-DDTHH:mm), so a plain string comparison is correct and timezone-free.
 */
export function isWithinStay(scheduledAt: string, stay: Stay): boolean {
  const day = scheduledAt.slice(0, 10);
  return day >= stay.arrivalDate && day <= stay.departureDate;
}

export function totalCents(items: readonly { priceCents: number }[]): number {
  return items.reduce((sum, item) => sum + item.priceCents, 0);
}
