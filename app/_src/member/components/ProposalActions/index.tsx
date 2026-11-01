"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/app/_src/common/components/Button";
import { apiRequest, errorMessage } from "@/app/_src/common/utils/api-client";
import { focusWhenRendered } from "@/app/_src/common/utils/focus-when-rendered";
import type { ProposalStatus } from "@/domain/proposals/status";
import { cn } from "cn";
import { CONFIRMATION_HEADING_ID } from "../ConfirmationPanel";

type Props = {
  proposalId: string;
  /** Only "sent" and "approved" have an action; other statuses render nothing. */
  status: ProposalStatus;
  /** "steps" shows the full two-step flow (summary card); "bar" only the next action (mobile). */
  variant: "steps" | "bar";
};

const STEP_ACTION = {
  approved: { label: "Approve itinerary", success: "Itinerary approved" },
  paid: { label: "Pay & Lock In", success: "Payment received — you’re all set" },
} as const;

const GOLD_BUTTON = "h-11 w-full bg-gold text-ink hover:bg-gold/85 text-base";

export function ProposalActions({ proposalId, status, variant }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (status !== "sent" && status !== "approved") return null;
  const next = status === "sent" ? "approved" : "paid";

  async function advance() {
    setPending(true);
    try {
      await apiRequest(`/api/proposals/${proposalId}`, { method: "PATCH", body: { status: next } });
      toast.success(STEP_ACTION[next].success);
      // The clicked button disappears on refresh; take focus to what comes next instead of <body>.
      focusWhenRendered(next === "approved" ? `pay-action-${variant}` : CONFIRMATION_HEADING_ID);
    } catch (error) {
      // e.g. already approved in another tab: show why, then show the current state.
      toast.error("That didn’t go through", { description: errorMessage(error) });
    } finally {
      setPending(false);
      router.refresh();
    }
  }

  const actionButton = (
    <Button
      type="button"
      id={next === "paid" ? `pay-action-${variant}` : undefined}
      onClick={advance}
      disabled={pending}
      className={GOLD_BUTTON}
    >
      {pending ? "One moment…" : STEP_ACTION[next].label}
    </Button>
  );

  if (variant === "bar") return actionButton;

  return (
    <ol className="grid gap-4">
      <li className="grid gap-2" aria-current={status === "sent" ? "step" : undefined}>
        <p className="flex items-center gap-2 text-sm font-medium">
          <StepMarker number={1} done={status === "approved"} />
          Approve the itinerary
        </p>
        {status === "sent" ? (
          actionButton
        ) : (
          <p className="pl-8 text-sm text-muted-foreground">Approved — thank you.</p>
        )}
      </li>
      <li className="grid gap-2" aria-current={status === "approved" ? "step" : undefined}>
        <p className="flex items-center gap-2 text-sm font-medium">
          <StepMarker number={2} done={false} />
          Pay &amp; lock it in
        </p>
        {status === "approved" ? (
          <>
            {actionButton}
            <p className="text-xs text-muted-foreground">Payment is simulated in this demo.</p>
          </>
        ) : (
          <p className="pl-8 text-sm text-muted-foreground">Available once you approve the itinerary.</p>
        )}
      </li>
    </ol>
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
