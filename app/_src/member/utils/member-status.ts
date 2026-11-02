import type { ProposalStatus } from "@/domain/proposals/status";

/** What each status means to the member, in their words rather than the system's. */
export const MEMBER_STATUS: Record<ProposalStatus, string> = {
  draft: "Preview — not yet sent",
  sent: "Awaiting your approval",
  approved: "Approved · awaiting payment",
  paid: "Paid & locked in",
};

/** Statuses where the member still has something to do (approve, then pay). */
export const isActionable = (status: ProposalStatus) => status === "sent" || status === "approved";

