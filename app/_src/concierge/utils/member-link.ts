/** The absolute link a member opens to see their proposal (the same one the email contains). */
export function memberLink(proposalId: string): string {
  return `${window.location.origin}/proposal/${proposalId}`;
}
