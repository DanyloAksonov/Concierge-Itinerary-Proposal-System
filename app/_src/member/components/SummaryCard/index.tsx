import type { ProposalDto } from "@/domain/proposals/service";
import { MEMBER_STATUS, isActionable } from "@/app/_src/member/utils/member-status";
import { formatMoney } from "@/lib/format";
import { ProposalActions } from "../ProposalActions";

type Props = Pick<ProposalDto, "id" | "status" | "totalCents" | "items">;

export function SummaryCard({ id, status, totalCents, items }: Props) {
  return (
    <section aria-labelledby="summary-heading" className="grid gap-5 rounded-md bg-panel p-6">
      <h2
        id="summary-heading"
        className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
      >
        Summary
      </h2>
      <div className="grid gap-1">
        <p className="text-sm text-muted-foreground">
          Estimated total · {items.length} {items.length === 1 ? "experience" : "experiences"}
        </p>
        <p className="font-display text-4xl font-semibold tabular-nums">{formatMoney(totalCents)}</p>
      </div>
      {/* While the member can act, the status line lives in ProposalActions so it follows the
          optimistic approval; otherwise (draft, paid) it's static. */}
      {isActionable(status) ? (
        <ProposalActions proposalId={id} status={status} variant="steps" />
      ) : (
        <p className="border-t pt-4 text-sm">
          <span className="text-muted-foreground">Status </span>
          <span className="font-medium">{MEMBER_STATUS[status]}</span>
        </p>
      )}
    </section>
  );
}
