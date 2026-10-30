import { connection } from "next/server";
import { ProposalBuilder } from "@/app/_src/concierge/components/ProposalBuilder";
import { ProposalsTable } from "@/app/_src/concierge/components/ProposalsTable";
import { TripHeader } from "@/app/_src/concierge/components/TripHeader";
import { conciergeService } from "@/domain/concierges/service";
import { proposalService } from "@/domain/proposals/service";
import { reservationService } from "@/domain/reservations/service";

export default async function ConciergeDashboard() {
  await connection(); // DB reads: render per request, inside loading.tsx's Suspense boundary

  const [{ reservations }, { proposals }, concierge] = await Promise.all([
    reservationService.listReservations(),
    proposalService.listProposals(),
    conciergeService.getCurrent(),
  ]);

  // One reservation in the brief; supporting several in the UI is a stretch goal.
  const trip = reservations[0];
  if (!trip) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-semibold">No upcoming reservation</h1>
        <p className="mt-2 text-muted-foreground">
          The database has no reservation yet. Run <code>npm run db:seed</code> and reload.
        </p>
      </main>
    );
  }

  const tripProposals = proposals.filter(
    (proposal) => proposal.reservationId === trip.reservation.id,
  );

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
            proposals={tripProposals}
            memberName={trip.member.name}
            timeZone={trip.reservation.timeZone}
          />
        </section>
      </main>
    </>
  );
}
