import { StatusBadge } from "@/app/_src/common/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_src/common/components/Table";
import { CATEGORIES } from "@/domain/proposals/categories";
import { formatClockTime, formatDaySpan, formatMoney, formatShortDay, formatTimestamp } from "@/lib/format";
import type { ProposalSummaryDto } from "@/domain/proposals/service";
import { ExpandableProposalRow } from "../ExpandableProposalRow";
import { ProposalRowActions } from "../ProposalRowActions";

type Props = {
  proposals: ProposalSummaryDto[];
  memberName: string;
  /** Audit timestamps are shown in the destination's time zone, where the concierge works. */
  timeZone: string;
  /** The draft currently open in the builder, highlighted in the list. */
  editingId: string | null;
};

const COLUMN_COUNT = 7;

// Day span only: categories are listed per item when the row is expanded, and here they made the
// row several lines tall in a narrow column.
function summaryLine(proposal: ProposalSummaryDto): string {
  return proposal.firstDay && proposal.lastDay
    ? formatDaySpan(proposal.firstDay, proposal.lastDay)
    : "No items yet";
}

// Columns that repeat information get dropped first on narrower screens.
const FROM_LG = "hidden lg:table-cell";
const FROM_XL = "hidden xl:table-cell";

// Status says how far a proposal got; the exact times live in the expanded row, which keeps the
// table narrow enough not to scroll sideways.
const PROGRESS = [
  { key: "sentAt", label: "Sent" },
  { key: "approvedAt", label: "Approved" },
  { key: "paidAt", label: "Paid" },
] as const;

type DetailsProps = { proposal: ProposalSummaryDto; timeZone: string };

/** The expanded view of a row: progress times, then each item on one line, in time order. */
function ProposalDetails({ proposal, timeZone }: DetailsProps) {
  return (
    <div className="grid max-w-3xl gap-1 py-2 pr-4 pl-8 text-sm">
      <dl className="flex flex-wrap gap-x-6 gap-y-1 py-1">
        {PROGRESS.map(({ key, label }) => {
          const at = proposal[key];
          return (
            <div key={key} className="flex gap-1.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="tabular-nums">
                {at ? (
                  <time dateTime={at}>{formatTimestamp(at, timeZone)}</time>
                ) : (
                  <>
                    <span aria-hidden>—</span>
                    <span className="sr-only">Not yet</span>
                  </>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <ItemsList items={proposal.items} />
    </div>
  );
}

function ItemsList({ items }: { items: ProposalSummaryDto["items"] }) {
  if (items.length === 0) {
    return <p className="border-t py-2 text-muted-foreground">No items yet.</p>;
  }
  return (
    // Three compact columns that wrap instead of widening the table.
    <ul className="divide-y border-t">
      {items.map((item) => (
        <li key={item.id} className="grid grid-cols-[10rem_minmax(0,1fr)_auto] items-baseline gap-3 py-2">
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            {formatShortDay(item.scheduledAt.slice(0, 10))}, {formatClockTime(item.scheduledAt)}
          </span>
          <span className="min-w-0">
            <span className="break-words">{item.title}</span>
            <span className="block text-xs text-muted-foreground">{CATEGORIES[item.category].label}</span>
          </span>
          <span className="tabular-nums">{formatMoney(item.priceCents)}</span>
        </li>
      ))}
    </ul>
  );
}

export function ProposalsTable({ proposals, memberName, timeZone, editingId }: Props) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Proposal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className={`${FROM_LG} text-right`}>Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className={FROM_XL}>Prepared by</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="py-6 text-center text-muted-foreground">
                No proposals yet. Build one above and send it to {memberName}.
              </TableCell>
            </TableRow>
          ) : (
            proposals.map((proposal) => (
              <ExpandableProposalRow
                key={proposal.id}
                title={proposal.title}
                summary={summaryLine(proposal)}
                columnCount={COLUMN_COUNT}
                className={proposal.id === editingId ? "bg-accent hover:bg-accent" : undefined}
                details={<ProposalDetails proposal={proposal} timeZone={timeZone} />}
                cells={
                  <>
                    <TableCell>
                      <StatusBadge status={proposal.status} />
                      {proposal.id === editingId && (
                        <span className="ml-2 text-xs font-medium">Editing</span>
                      )}
                    </TableCell>
                    <TableCell className={`${FROM_LG} text-right tabular-nums`}>{proposal.itemCount}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(proposal.totalCents)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      <time dateTime={proposal.createdAt}>
                        {formatTimestamp(proposal.createdAt, timeZone)}
                      </time>
                    </TableCell>
                    <TableCell className={FROM_XL}>{proposal.conciergeName}</TableCell>
                    <TableCell>
                      <ProposalRowActions
                        proposalId={proposal.id}
                        status={proposal.status}
                        memberName={memberName}
                        isEditing={proposal.id === editingId}
                      />
                    </TableCell>
                  </>
                }
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
