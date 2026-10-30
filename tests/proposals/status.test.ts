import { describe, expect, it } from "vitest";
import { DomainError } from "@/lib/errors";
import {
  PROPOSAL_STATUSES,
  type ProposalStatus,
  assertTransition,
  canTransition,
  nextStatus,
} from "@/lib/proposals/status";

const ALLOWED: Array<[ProposalStatus, ProposalStatus]> = [
  ["draft", "sent"],
  ["sent", "approved"],
  ["approved", "paid"],
];

const isAllowed = (from: ProposalStatus, to: ProposalStatus) =>
  ALLOWED.some(([f, t]) => f === from && t === to);

const ALL_PAIRS = PROPOSAL_STATUSES.flatMap((from) =>
  PROPOSAL_STATUSES.map((to) => [from, to] as [ProposalStatus, ProposalStatus]),
);

describe("proposal status machine", () => {
  it.each(ALLOWED)("allows %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it.each(ALL_PAIRS.filter(([from, to]) => !isAllowed(from, to)))(
    "rejects %s → %s",
    (from, to) => {
      expect(canTransition(from, to)).toBe(false);
    },
  );

  it("throws an INVALID_TRANSITION domain error with context", () => {
    try {
      assertTransition("draft", "paid");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toMatchObject({
        code: "INVALID_TRANSITION",
        details: { from: "draft", to: "paid", allowed: "sent" },
      });
    }
  });

  it("has no successor after paid", () => {
    expect(nextStatus("paid")).toBeNull();
    expect(nextStatus("draft")).toBe("sent");
  });
});
