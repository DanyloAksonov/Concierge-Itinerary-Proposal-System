import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProposalScreen } from "@/app/_src/member/screens/ProposalScreen";
import { destinationCity } from "@/app/_src/member/utils/destination";
import { DomainError } from "@/domain/errors";
import { proposalService } from "@/domain/proposals/service";

// One DB read per request, shared by generateMetadata and the page. Unknown ids render not-found.tsx.
const loadProposal = cache(async (id: string) => {
  try {
    return await proposalService.getProposal(id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
});

export async function generateMetadata({
  params,
}: PageProps<"/proposal/[id]">): Promise<Metadata> {
  const { reservation, member } = await loadProposal((await params).id);
  return {
    title: `Your ${destinationCity(reservation.destination)} Itinerary`,
    description: `A personal itinerary for ${member.name} at ${reservation.villa}.`,
    // A private link: keep it out of search engines even if it leaks.
    robots: { index: false, follow: false },
  };
}

export default async function MemberProposalPage({ params }: PageProps<"/proposal/[id]">) {
  return <ProposalScreen proposal={await loadProposal((await params).id)} />;
}
