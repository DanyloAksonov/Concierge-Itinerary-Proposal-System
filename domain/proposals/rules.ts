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

const DAY_MS = 24 * 60 * 60 * 1000;
const utcDate = (date: string) => new Date(`${date}T00:00:00Z`);

/** Every calendar day of the stay, arrival and departure included (YYYY-MM-DD). */
export function stayDays(stay: Stay): string[] {
  const days: string[] = [];
  for (let day = utcDate(stay.arrivalDate); day <= utcDate(stay.departureDate); ) {
    days.push(day.toISOString().slice(0, 10));
    day = new Date(day.getTime() + DAY_MS);
  }
  return days;
}

export function nightsOf(stay: Stay): number {
  return Math.round((utcDate(stay.departureDate).getTime() - utcDate(stay.arrivalDate).getTime()) / DAY_MS);
}
