import "server-only";
import { prisma } from "@/lib/db/client";
import { getCurrentConcierge, toConciergeDto } from "@/domain/concierges/service";
import { DomainError } from "@/domain/errors";
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import { toReservationDto } from "@/domain/reservations/service";
import { composeProposalEmail } from "./email";
import { isWithinStay, totalCents } from "./rules";
import { type ProposalStatus, type TargetStatus, assertTransition } from "./status";
import type { CreateProposalInput, DraftChanges, ItemInput } from "./validation";

const proposalInclude = {
  items: { orderBy: [{ scheduledAt: "asc" }, { id: "asc" }] },
  reservation: { include: { member: true } },
  concierge: true,
} satisfies Prisma.ProposalInclude;

type ProposalRecord = Prisma.ProposalGetPayload<{ include: typeof proposalInclude }>;
const proposalSummaryInclude = {
  items: {
    select: { priceCents: true, category: true, scheduledAt: true },
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
  },
  concierge: { select: { name: true } },
} satisfies Prisma.ProposalInclude;

type ProposalSummaryRecord = Prisma.ProposalGetPayload<{ include: typeof proposalSummaryInclude }>;

// --- DTOs: the public shape shared by the API and Server Components (internal ids stay internal).

function toProposalDto(proposal: ProposalRecord) {
  return {
    id: proposal.publicId,
    title: proposal.title,
    status: proposal.status,
    note: proposal.note,
    createdAt: proposal.createdAt.toISOString(),
    sentAt: proposal.sentAt?.toISOString() ?? null,
    approvedAt: proposal.approvedAt?.toISOString() ?? null,
    paidAt: proposal.paidAt?.toISOString() ?? null,
    items: proposal.items.map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      description: item.description,
      scheduledAt: item.scheduledAt,
      priceCents: item.priceCents,
    })),
    totalCents: totalCents(proposal.items),
    ...toReservationDto(proposal.reservation),
    concierge: toConciergeDto(proposal.concierge),
  };
}

function toProposalSummaryDto(proposal: ProposalSummaryRecord) {
  const { items } = proposal; // sorted by time
  return {
    id: proposal.publicId,
    title: proposal.title,
    reservationId: proposal.reservationId,
    conciergeName: proposal.concierge.name,
    status: proposal.status,
    itemCount: items.length,
    totalCents: totalCents(items),
    /** Distinct item categories, in the order they first happen. Derived — a proposal mixes them. */
    categories: [...new Set(items.map((item) => item.category))],
    /** First and last day with an item (YYYY-MM-DD), null for an empty draft. */
    firstDay: items[0]?.scheduledAt.slice(0, 10) ?? null,
    lastDay: items.at(-1)?.scheduledAt.slice(0, 10) ?? null,
    createdAt: proposal.createdAt.toISOString(),
    sentAt: proposal.sentAt?.toISOString() ?? null,
    approvedAt: proposal.approvedAt?.toISOString() ?? null,
    paidAt: proposal.paidAt?.toISOString() ?? null,
  };
}

export type ProposalDto = ReturnType<typeof toProposalDto>;
export type ProposalSummaryDto = ReturnType<typeof toProposalSummaryDto>;
export type SentEmailDto = { toEmail: string; subject: string; bodyPreview: string; sentAt: string };

// --- Errors and guards

const notFound = (publicId: string) =>
  new DomainError("NOT_FOUND", `Proposal "${publicId}" was not found.`);

// Raised when a guarded update matches no row: another request changed the status first.
const concurrentChange = () =>
  new DomainError("CONFLICT", "This proposal was just updated by someone else. Reload and try again.");

function assertItemsWithinStay(
  items: readonly ItemInput[],
  stay: { arrivalDate: string; departureDate: string },
) {
  const outside = items
    .map((item, index) => ({ index, title: item.title, scheduledAt: item.scheduledAt }))
    .filter((item) => !isWithinStay(item.scheduledAt, stay));

  if (outside.length > 0) {
    throw new DomainError(
      "RULE_VIOLATION",
      `Items must be scheduled during the stay (${stay.arrivalDate} to ${stay.departureDate}).`,
      { items: outside },
    );
  }
}

const STATUS_TIMESTAMP = {
  sent: "sentAt",
  approved: "approvedAt",
  paid: "paidAt",
} as const satisfies Record<TargetStatus, keyof Prisma.ProposalUpdateManyMutationInput>;

// --- Service

export function createProposalService(db: PrismaClient) {
  async function findProposal(publicId: string, tx: Prisma.TransactionClient = db) {
    const proposal = await tx.proposal.findUnique({ where: { publicId }, include: proposalInclude });
    if (!proposal) throw notFound(publicId);
    return proposal;
  }

  async function listProposals() {
    const proposals = await db.proposal.findMany({
      include: proposalSummaryInclude,
      orderBy: { createdAt: "desc" },
    });
    return { proposals: proposals.map(toProposalSummaryDto) };
  }

  async function getProposal(publicId: string) {
    return toProposalDto(await findProposal(publicId));
  }

  async function createProposal(input: CreateProposalInput) {
    const reservation = await db.reservation.findUnique({ where: { id: input.reservationId } });
    if (!reservation) {
      throw new DomainError("NOT_FOUND", `Reservation ${input.reservationId} was not found.`);
    }
    assertItemsWithinStay(input.items, reservation);
    const concierge = await getCurrentConcierge(db);

    const proposal = await db.proposal.create({
      data: {
        reservationId: reservation.id,
        conciergeId: concierge.id,
        title: input.title,
        note: input.note,
        items: { create: input.items },
      },
      include: proposalInclude,
    });
    return toProposalDto(proposal);
  }

  /** Drafts are editable; once sent, a proposal is immutable. `items` replaces the whole list. */
  async function updateDraft(publicId: string, changes: DraftChanges) {
    const proposal = await db.$transaction(async (tx) => {
      const current = await findProposal(publicId, tx);
      if (current.status !== "draft") {
        throw new DomainError(
          "CONFLICT",
          `Only draft proposals can be edited; this one is "${current.status}".`,
        );
      }
      if (changes.items) assertItemsWithinStay(changes.items, current.reservation);

      return tx.proposal.update({
        where: { id: current.id },
        data: {
          title: changes.title,
          note: changes.note,
          items: changes.items && { deleteMany: {}, create: changes.items },
        },
        include: proposalInclude,
      });
    });
    return toProposalDto(proposal);
  }

  /**
   * draft → sent: status, timestamp and the email record are written in one transaction, so a
   * proposal is never "sent" without an email (or vice versa). The console log runs after commit.
   */
  async function sendProposal(publicId: string, { baseUrl }: { baseUrl: string }) {
    const { proposal, email } = await db.$transaction(async (tx) => {
      const current = await findProposal(publicId, tx);
      assertTransition(current.status, "sent");
      if (current.items.length === 0) {
        throw new DomainError("CONFLICT", "Add at least one item before sending the proposal.");
      }

      const { count } = await tx.proposal.updateMany({
        where: { id: current.id, status: current.status },
        data: { status: "sent", sentAt: new Date() },
      });
      if (count === 0) throw concurrentChange();

      const email = await tx.sentEmail.create({
        data: { proposalId: current.id, ...composeProposalEmail(current, baseUrl) },
      });
      return { proposal: await findProposal(publicId, tx), email };
    });

    console.log(
      `[email] To: ${email.toEmail}\n[email] Subject: ${email.subject}\n\n${email.bodyPreview}\n`,
    );

    const sentEmail: SentEmailDto = {
      toEmail: email.toEmail,
      subject: email.subject,
      bodyPreview: email.bodyPreview,
      sentAt: email.sentAt.toISOString(),
    };
    return { proposal: toProposalDto(proposal), email: sentEmail };
  }

  /**
   * Moves a proposal one step along draft → sent → approved → paid. The UPDATE is guarded by the
   * status we read, so two concurrent requests (e.g. a double-clicked "Pay") can't both succeed.
   */
  async function changeStatus(publicId: string, to: ProposalStatus, context: { baseUrl: string }) {
    if (to === "sent") return (await sendProposal(publicId, context)).proposal;

    const current = await findProposal(publicId);
    assertTransition(current.status, to);

    const { count } = await db.proposal.updateMany({
      where: { id: current.id, status: current.status },
      data: { status: to, [STATUS_TIMESTAMP[to]]: new Date() },
    });
    if (count === 0) throw concurrentChange();

    return getProposal(publicId);
  }

  return {
    listProposals,
    getProposal,
    createProposal,
    updateDraft,
    sendProposal,
    changeStatus,
  };
}

export const proposalService = createProposalService(prisma);
