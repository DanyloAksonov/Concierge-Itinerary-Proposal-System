import { ProposalBuilder } from "@/app/_src/concierge/components/ProposalBuilder";
import { ProposalsTable } from "@/app/_src/concierge/components/ProposalsTable";
import { TripHeader } from "@/app/_src/concierge/components/TripHeader";
import type { ConciergeDto } from "@/domain/concierges/service";
import type { ProposalSummaryDto } from "@/domain/proposals/service";
import type { ReservationDto } from "@/domain/reservations/service";

type Props = {
  trip: ReservationDto;
  /** Proposals for this trip only. */
  proposals: ProposalSummaryDto[];
  concierge: ConciergeDto;
};

/** The concierge's working screen for one trip: build and send proposals, track their progress. */
export function DashboardScreen({ trip, proposals, concierge }: Props) {
  return (
    <>
      <TripHeader {...trip} concierge={concierge} />
      <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-6 sm:px-6">
        <ProposalBuilder {...trip} />
        <section aria-labelledby="proposals-heading" className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="proposals-heading" className="text-base font-semibold">
              Proposals
            </h2>
            <p className="text-sm text-muted-foreground">
              Times in {trip.reservation.destination} local time
            </p>
          </div>
          <ProposalsTable
            proposals={proposals}
            memberName={trip.member.name}
            timeZone={trip.reservation.timeZone}
          />
        </section>
      </main>
    </>
  );
}
