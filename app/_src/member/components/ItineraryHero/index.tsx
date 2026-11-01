import type { ProposalDto } from "@/domain/proposals/service";
import { nightsOf } from "@/domain/proposals/rules";
import { formatStayRange } from "@/lib/format";
import { destinationCity, destinationCountry } from "@/app/_src/common/utils/destination";

type Props = Pick<ProposalDto, "title" | "reservation" | "member" | "items">;

export function ItineraryHero({ title, reservation, member, items }: Props) {
  const nights = nightsOf(reservation);
  const facts = [
    formatStayRange(reservation.arrivalDate, reservation.departureDate),
    `${nights} ${nights === 1 ? "night" : "nights"}`,
    `${items.length} ${items.length === 1 ? "experience" : "experiences"}`,
  ];

  return (
    <div className="grid gap-3 py-10 sm:py-14">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-text">{title}</p>
      <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
        Your {destinationCity(reservation.destination)} Itinerary
      </h1>
      <p className="text-lg text-muted-foreground">
        Prepared for {member.name} · {reservation.villa}, {destinationCountry(reservation.destination)}
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm font-medium uppercase tracking-[0.14em]">
        {facts.map((fact, index) => (
          <li key={fact} className="flex items-center gap-6">
            {index > 0 && (
              <span aria-hidden className="size-1 rounded-full bg-gold" />
            )}
            {fact}
          </li>
        ))}
      </ul>
    </div>
  );
}
