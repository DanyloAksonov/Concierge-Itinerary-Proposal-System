import type { Metadata } from "next";
import { connection } from "next/server";
import { DashboardScreen } from "@/app/_src/concierge/screens/DashboardScreen";
import { NoReservationScreen } from "@/app/_src/concierge/screens/NoReservationScreen";
import { conciergeService } from "@/domain/concierges/service";
import { DomainError } from "@/domain/errors";
import { proposalService } from "@/domain/proposals/service";
import { reservationService } from "@/domain/reservations/service";

export const metadata: Metadata = {
  title: "Concierge dashboard",
  robots: { index: false, follow: false }, // internal tool
};

/** The draft named by `?edit=<id>`, or null when it's missing, not a draft, or for another trip. */
async function loadEditableDraft(id: string | string[] | undefined, reservationId: number) {
  if (typeof id !== "string") return null;
  try {
    const proposal = await proposalService.getProposal(id);
    return proposal.status === "draft" && proposal.reservation.id === reservationId ? proposal : null;
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") return null;
    throw error;
  }
}

export default async function ConciergeDashboardPage({ searchParams }: PageProps<"/concierge">) {
  await connection(); // DB reads: render per request, inside loading.tsx's Suspense boundary

  const [{ reservations }, { proposals }, concierge] = await Promise.all([
    reservationService.listReservations(),
    proposalService.listProposals(),
    conciergeService.getCurrent(),
  ]);

  // One reservation in the brief; supporting several in the UI is a stretch goal.
  const trip = reservations[0];
  if (!trip) return <NoReservationScreen />;

  const editing = await loadEditableDraft((await searchParams).edit, trip.reservation.id);

  return (
    <DashboardScreen
      trip={trip}
      proposals={proposals.filter((proposal) => proposal.reservationId === trip.reservation.id)}
      concierge={concierge}
      editing={editing}
    />
  );
}
