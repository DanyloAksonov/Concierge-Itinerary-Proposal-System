import type { ProposalDto } from "@/domain/proposals/service";
import { formatMoney } from "@/lib/format";
import { ProposalActions } from "../ProposalActions";

type Props = Pick<ProposalDto, "id" | "status" | "totalCents">;

/**
 * Phone-width replacement for the summary card: total plus the next action, fixed to the bottom.
 * The page adds matching bottom padding so the bar never covers focused content.
 */
export function MobileActionBar({ id, status, totalCents }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex max-w-[1100px] items-center gap-4 px-4 py-3 sm:px-6">
        <div className="shrink-0">
          <p className="text-xs text-muted-foreground">Estimated total</p>
          <p className="font-display text-2xl font-semibold tabular-nums">{formatMoney(totalCents)}</p>
        </div>
        <div className="flex-1">
          <ProposalActions proposalId={id} status={status} variant="bar" />
        </div>
      </div>
    </div>
  );
}
