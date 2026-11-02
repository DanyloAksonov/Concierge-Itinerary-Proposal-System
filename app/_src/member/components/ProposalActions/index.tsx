"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/app/_src/common/components/Button";
import { ApiError, apiRequest, errorMessage } from "@/app/_src/common/utils/api-client";
import { focusWhenRendered } from "@/app/_src/common/utils/focus-when-rendered";
import { MEMBER_STATUS, isActionable } from "@/app/_src/member/utils/member-status";
import type { ProposalStatus } from "@/domain/proposals/status";
import { cn } from "cn";
import { CONFIRMATION_HEADING_ID } from "../ConfirmationPanel";

type Props = {
  proposalId: string;
  /** Only "sent" and "approved" have an action; other statuses render nothing. */
  status: ProposalStatus;
  /** "steps" shows the status and the two-step flow (summary card); "bar" only the next action. */
  variant: "steps" | "bar";
};

const GOLD_BUTTON = "h-11 w-full bg-gold text-ink hover:bg-gold/85 text-base";

// The API's state errors ("Cannot move a proposal from …") are written for developers; a member
// only needs to know the itinerary changed elsewhere and that the page now shows the latest.
function memberErrorMessage(error: unknown): string {
  if (error instanceof ApiError && (error.code === "INVALID_TRANSITION" || error.code === "CONFLICT")) {
    return "Your itinerary was updated in another window. We’re showing its latest status.";
  }
  return errorMessage(error);
}

/**
 * Approve is optimistic: the stepper moves on at once and rolls back if the server refuses —
 * approving is cheap and nearly always succeeds. Pay is deliberately not: "locked in" must never
 * show for a payment that might still fail, so it waits for the server.
 */
export function ProposalActions({ proposalId, status, variant }: Props) {
  const router = useRouter();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [approving, startApproval] = useTransition();
  const [paying, setPaying] = useState(false);

  if (!isActionable(optimisticStatus)) return null;
  const payId = `pay-action-${variant}`;

  function approve() {
    startApproval(async () => {
      setOptimisticStatus("approved");
      // The Approve button is gone already; focus the Pay button that replaced it.
      focusWhenRendered(payId);
      try {
        await apiRequest(`/api/proposals/${proposalId}`, {
          method: "PATCH",
          body: { status: "approved" },
        });
        toast.success("Itinerary approved");
      } catch (error) {
        // The optimistic status is dropped when this transition ends, so the stepper rolls back.
        toast.error("That didn’t go through", { description: memberErrorMessage(error) });
      }
      router.refresh(); // inside the transition: server truth replaces the optimistic value
    });
  }

  async function pay() {
    setPaying(true);
    try {
      await apiRequest(`/api/proposals/${proposalId}`, { method: "PATCH", body: { status: "paid" } });
      toast.success("Payment received — you’re all set");
      // The confirmation appears at the top of the page; take focus (and the member) there.
      focusWhenRendered(CONFIRMATION_HEADING_ID);
    } catch (error) {
      toast.error("That didn’t go through", { description: memberErrorMessage(error) });
    } finally {
      setPaying(false);
      router.refresh();
    }
  }

  const approveButton = (
    <Button type="button" onClick={approve} className={GOLD_BUTTON}>
      Approve itinerary
    </Button>
  );
  const payButton = (
    // Locked until the approval is saved, so a quick second click can't pay before approving.
    // aria-disabled, not disabled: a disabled button can't take focus, and focus moves here
    // as soon as Approve is clicked.
    <Button
      type="button"
      id={payId}
      onClick={() => !approving && pay()}
      aria-disabled={approving || undefined}
      disabled={paying}
      className={cn(GOLD_BUTTON, "aria-disabled:cursor-not-allowed aria-disabled:opacity-50")}
    >
      {paying ? "One moment…" : "Pay & Lock In"}
    </Button>
  );
  const nextButton = optimisticStatus === "sent" ? approveButton : payButton;

  if (variant === "bar") return nextButton;

  return (
    <>
      <p className="border-t pt-4 text-sm">
        <span className="text-muted-foreground">Status </span>
        <span className="font-medium">{MEMBER_STATUS[optimisticStatus]}</span>
      </p>
      <ol className="grid gap-4">
        <li className="grid gap-2" aria-current={optimisticStatus === "sent" ? "step" : undefined}>
          <p className="flex items-center gap-2 text-sm font-medium">
            <StepMarker number={1} done={optimisticStatus === "approved"} />
            Approve the itinerary
          </p>
          {optimisticStatus === "sent" ? (
            approveButton
          ) : (
            <p className="pl-8 text-sm text-muted-foreground">Approved — thank you.</p>
          )}
        </li>
        <li className="grid gap-2" aria-current={optimisticStatus === "approved" ? "step" : undefined}>
          <p className="flex items-center gap-2 text-sm font-medium">
            <StepMarker number={2} done={false} />
            Pay &amp; lock it in
          </p>
          {optimisticStatus === "approved" ? (
            <>
              {payButton}
              <p role="status" className="text-xs text-muted-foreground">
                {approving ? "Saving your approval…" : "Payment is simulated in this demo."}
              </p>
            </>
          ) : (
            <p className="pl-8 text-sm text-muted-foreground">Available once you approve the itinerary.</p>
          )}
        </li>
      </ol>
    </>
  );
}

function StepMarker({ number, done }: { number: number; done: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 place-items-center rounded-full border text-xs",
        done ? "border-gold bg-gold text-ink" : "border-input",
      )}
    >
      {done ? <Check className="size-3.5" /> : number}
    </span>
  );
}
