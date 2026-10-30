import { formatMoney, formatStayRange } from "@/lib/format";
import { totalCents } from "./rules";

type EmailContext = {
  publicId: string;
  items: readonly { priceCents: number }[];
  reservation: {
    villa: string;
    arrivalDate: string;
    departureDate: string;
    member: { name: string; email: string };
  };
};

/** Builds the (simulated) proposal email; the link is the member's only way into the proposal. */
export function composeProposalEmail(proposal: EmailContext, baseUrl: string) {
  const { reservation, items } = proposal;
  const link = new URL(`/proposal/${proposal.publicId}`, baseUrl).toString();
  const experiences = items.length === 1 ? "1 experience" : `${items.length} experiences`;

  return {
    toEmail: reservation.member.email,
    subject: `Your itinerary for ${reservation.villa} is ready`,
    bodyPreview: [
      `Dear ${reservation.member.name},`,
      `Your concierge has prepared a personal itinerary for your stay at ${reservation.villa} ` +
        `(${formatStayRange(reservation.arrivalDate, reservation.departureDate)}): ` +
        `${experiences}, estimated total ${formatMoney(totalCents(items))}.`,
      `Review and approve it here: ${link}`,
    ].join("\n\n"),
  };
}
