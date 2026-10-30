// Reservations store the destination as "City, Country" (e.g. "Punta Mita, Mexico").

/** "Punta Mita, Mexico" → "Punta Mita" */
export function destinationCity(destination: string): string {
  return destination.split(",")[0].trim();
}

/** "Punta Mita, Mexico" → "Mexico" (the whole string if there is no comma) */
export function destinationCountry(destination: string): string {
  return destination.split(",").at(-1)!.trim();
}
