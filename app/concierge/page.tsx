import type { Metadata } from "next";
import { connection } from "next/server";
import { DashboardScreen } from "@/app/_src/concierge/screens/DashboardScreen";
import { NoReservationScreen } from "@/app/_src/concierge/screens/NoReservationScreen";
import { conciergeService } from "@/domain/concierges/service";
import { proposalService } from "@/domain/proposals/service";
import { reservationService } from "@/domain/reservations/service";

export const metadata: Metadata = {
  title: "Concierge dashboard",
  robots: { index: false, follow: false }, // internal tool
};

export default async function ConciergeDashboardPage() {
  await connection(); // DB reads: render per request, inside loading.tsx's Suspense boundary

  const [{ reservations }, { proposals }, concierge] = await Promise.all([
    reservationService.listReservations(),
    proposalService.listProposals(),
    conciergeService.getCurrent(),
  ]);

  // One reservation in the brief; supporting several in the UI is a stretch goal.
  const trip = reservations[0];
  if (!trip) return <NoReservationScreen />;

  return (
    <DashboardScreen
      trip={trip}
      proposals={proposals.filter((proposal) => proposal.reservationId === trip.reservation.id)}
      concierge={concierge}
    />
  );
}
