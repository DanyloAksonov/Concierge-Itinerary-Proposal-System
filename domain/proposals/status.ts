import { DomainError } from "@/domain/errors";
import { ProposalStatus } from "@/lib/generated/prisma/enums";

export { ProposalStatus };

export const PROPOSAL_STATUSES = Object.values(ProposalStatus);

/** Statuses a proposal can move *to* — nothing ever goes back to draft. */
export type TargetStatus = Exclude<ProposalStatus, "draft">;

// The workflow is strictly linear, so each status has at most one successor.
const NEXT_STATUS: Record<ProposalStatus, ProposalStatus | null> = {
  draft: "sent",
  sent: "approved",
  approved: "paid",
  paid: null,
};

export function nextStatus(from: ProposalStatus): ProposalStatus | null {
  return NEXT_STATUS[from];
}

export function canTransition(from: ProposalStatus, to: ProposalStatus): boolean {
  return NEXT_STATUS[from] === to;
}

export function assertTransition(
  from: ProposalStatus,
  to: ProposalStatus,
): asserts to is TargetStatus {
  if (!canTransition(from, to)) {
    throw new DomainError(
      "INVALID_TRANSITION",
      `Cannot move a proposal from "${from}" to "${to}".`,
      { from, to, allowed: NEXT_STATUS[from] },
    );
  }
}
