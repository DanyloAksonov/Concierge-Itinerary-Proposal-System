import type { ConciergeDto } from "@/domain/concierges/service";
import { formatTripDate } from "@/lib/format";
import { nightsOf } from "@/domain/proposals/rules";
import type { ReservationDto } from "@/domain/reservations/service";

type Props = ReservationDto & { concierge: ConciergeDto };

/** App bar plus the trip being planned, pinned to the top while the concierge works. */
export function TripHeader({ reservation, member, concierge }: Props) {
  const facts = [
    { label: "Villa", value: `${reservation.villa}, ${reservation.destination}` },
    { label: "Arrival", value: formatTripDate(reservation.arrivalDate) },
    { label: "Departure", value: formatTripDate(reservation.departureDate) },
    { label: "Nights", value: String(nightsOf(reservation)) },
  ];

  return (
    <header className="sticky top-0 z-20 border-b bg-background">
      <div className="border-b bg-panel">
        <div className="mx-auto flex h-10 max-w-6xl items-center justify-between gap-4 px-4 text-sm sm:px-6">
          <span className="font-medium">Exclusive Resorts · Concierge</span>
          <span className="text-muted-foreground">
            Signed in as <span className="text-foreground">{concierge.name}</span>
          </span>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
        <h1 className="text-lg font-semibold">{member.name}</h1>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {facts.map((fact) => (
            <div key={fact.label} className="flex gap-1.5">
              <dt className="text-muted-foreground">{fact.label}</dt>
              <dd className="font-medium tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
